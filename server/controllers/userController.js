import { Webhook } from "svix";
import userModel from "../models/userModel.js";
import Razorpay from "razorpay";
import transactionModel from "../models/transactionModel.js";
import dotenv from "dotenv";

dotenv.config();

// API Controller function to manage clerk user with database
// http://localhost:3000/api/user/webhooks

const clerkWebhooks = async (req, res) => {
  try {
    // create a svix instance with clerk webhook secret
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = req.body;

    switch (type) {
      case "user.created": {
        const userData = {
          clerkId: data.id,
          email: data.email_addresses[0].email_address,
          firstName: data.first_name,
          lastName: data.last_name,
          photo: data.image_url,
        };
        await userModel.create(userData);
        res.json({});
        break;
      }
      case "user.updated": {
        const userData = {
          email: data.email_addresses[0].email_address,
          firstName: data.first_name,
          lastName: data.last_name,
          photo: data.image_url,
        };

        await userModel.findOneAndUpdate({ clerkId: data.id }, userData);
        res.json({});

        break;
      }
      case "user.deleted": {
        await userModel.findOneAndDelete({ clerkId: data.id });
        res.json({});
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API Controller function to get user available credits data

const userCredits = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const userData = await userModel.findOne({ clerkId });
    res.json({ success: true, credits: userData.creditBalance });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// gateway initialize
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// api to make payment for credits

const paymentRazorpay = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const { planId } = req.body;

    const userData = await userModel.findOne({ clerkId });
    if (!userData) {
      console.log("User not found");
      return res.json({ success: false, message: "User not found" });
    }

    if (!planId) {
      console.log("Plan ID missing");
      return res.json({ success: false, message: "Plan ID is required" });
    }

    let credits, plan, amount, date;

    // 🔧 Fixed: Use assignment (=) instead of property definition (:)
    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10;
        break;
      case "Advanced":
        plan = "Advanced";
        credits = 500;
        amount = 50;
        break;
      case "Business":
        plan = "Business";
        credits = 5000;
        amount = 250;
        break;
      default:
        console.log("Invalid plan ID:", planId);
        return res.json({ success: false, message: "Invalid plan selected" });
    }

    date = Date.now();

    // Creating transaction
    const transactionData = {
      clerkId,
      plan,
      amount,
      credits,
      date,
    };

    const newTransaction = await transactionModel.create(transactionData);

    const options = {
      amount: amount * 100, // Amount in paise/cents
      currency: process.env.CURRENCY || "INR",
      receipt: newTransaction._id.toString(),
    };

    // 🔧 Fixed: Use await instead of callback
    try {
      const order = await razorpayInstance.orders.create(options);

      res.json({
        success: true,
        order,
        message: "Order created successfully",
      });
    } catch (razorpayError) {
      console.error("Razorpay error:", razorpayError);
      return res.json({
        success: false,
        message: "Failed to create payment order: " + razorpayError.message,
      });
    }
  } catch (error) {
    console.error("Payment endpoint error:", error);
    res.json({
      success: false,
      message: error.message || "Server error occurred",
    });
  }
};

// API controller function to verify razorpay payment
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
    if (orderInfo.status === "paid") {
      const transactionData = await transactionModel.findById(
        orderInfo.receipt
      );
      if (transactionData.payment) {
        return res.json({ success: false, message: "Payment Failed !" });
      }

      // Adding Credits in user data
      const userData = await userModel.findOne({
        clerkId: transactionData.clerkId,
      });
      const creditBalance = userData.creditBalance + transactionData.credits;
      await userModel.findByIdAndUpdate(userData._id, { creditBalance });

      // making the payment true
      await transactionModel.findByIdAndUpdate(transactionData._id, {
        payment: true,
      });
      res.json({ success: true, message: "Credits" });
    }
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export { clerkWebhooks, userCredits, paymentRazorpay, verifyRazorpay };
