import type { Request, Response } from "express";
import { ok } from "../utils/apiResponse.js";
import { AppError } from "../utils/appError.js";

const COUPONS = {
  SAVE10: { type: "percentage", value: 10 },
  FLAT500: { type: "flat", value: 500 }
};

export const couponController = {
  validate: async (req: Request, res: Response) => {
    const { couponCode, totalAmount } = req.body;

    if (!couponCode || !totalAmount) {
      throw new AppError("couponCode and totalAmount are required", 400);
    }

    const coupon = COUPONS[couponCode as keyof typeof COUPONS];

    if (!coupon) {
      throw new AppError(`Coupon code '${couponCode}' is invalid`, 400);
    }

    let discount = 0;

    if (coupon.type === "percentage") {
      discount = (totalAmount * coupon.value) / 100;
    } else if (coupon.type === "flat") {
      discount = coupon.value;
    }

    // Ensure discount doesn't exceed totalAmount
    discount = Math.min(discount, totalAmount);

    const finalAmount = totalAmount - discount;

    res.status(200).json(
      ok(
        {
          couponCode,
          discount,
          finalAmount,
          totalAmount,
          message: `Coupon '${couponCode}' applied successfully`
        },
        "Coupon validated"
      )
    );
  }
};
