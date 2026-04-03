import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";

const demoTrains = [
  {
    id: "train_demo_1",
    operator: "Rajdhani Express",
    source: "Delhi",
    destination: "Mumbai",
    departureTime: new Date("2026-10-24T16:30:00Z"),
    arrivalTime: new Date("2026-10-25T08:30:00Z"),
    duration: "16h 00m",
    classType: "1AC",
    price: 4500,
    currency: "INR",
    trainNumber: "12952"
  },
  {
    id: "train_demo_2",
    operator: "Shatabdi Express",
    source: "Delhi",
    destination: "Chandigarh",
    departureTime: new Date("2026-10-24T07:40:00Z"),
    arrivalTime: new Date("2026-10-24T11:05:00Z"),
    duration: "3h 25m",
    classType: "CC",
    price: 1200,
    currency: "INR",
    trainNumber: "12045"
  },
  {
    id: "train_demo_3",
    operator: "Tejas Express",
    source: "Mumbai",
    destination: "Ahmedabad",
    departureTime: new Date("2026-10-24T15:40:00Z"),
    arrivalTime: new Date("2026-10-24T21:55:00Z"),
    duration: "6h 15m",
    classType: "EC",
    price: 2200,
    currency: "INR",
    trainNumber: "82901"
  }
];

const getTrainDelegate = () => (prisma as any).train;

const filterTrains = (source?: string, destination?: string) =>
  demoTrains.filter((train) => {
    const sourceOk = source
      ? train.source.toLowerCase().includes(source.toLowerCase())
      : true;
    const destinationOk = destination
      ? train.destination.toLowerCase().includes(destination.toLowerCase())
      : true;
    return sourceOk && destinationOk;
  });

export const trainController = {
  all: async (_req: Request, res: Response) => {
    const trainDelegate = getTrainDelegate();
    const data = trainDelegate
      ? await trainDelegate.findMany({ orderBy: { departureTime: "asc" } })
      : filterTrains();
    res.status(200).json(ok(data, "All trains fetched"));
  },

  search: async (req: Request, res: Response) => {
    const source = req.query.source ? String(req.query.source) : undefined;
    const destination = req.query.destination ? String(req.query.destination) : undefined;

    const trainDelegate = getTrainDelegate();
    const trains = trainDelegate
      ? await trainDelegate.findMany({
          where: {
            ...(source ? { source: { contains: source } } : {}),
            ...(destination ? { destination: { contains: destination } } : {})
          }
        })
      : filterTrains(source, destination);

    res.status(200).json(ok(trains, "Trains fetched"));
  }
};
