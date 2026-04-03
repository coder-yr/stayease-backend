import type { Request, Response } from "express";
import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";

const demoBuses = [
  {
    id: "bus_demo_1",
    operator: "Zingbus",
    source: "Delhi",
    destination: "Manali",
    departureTime: new Date("2026-10-24T20:00:00Z"),
    arrivalTime: new Date("2026-10-25T09:00:00Z"),
    duration: "13h 00m",
    busType: "AC Sleeper (2+1)",
    price: 1350,
    currency: "INR",
    busNumber: "ZB-1024"
  },
  {
    id: "bus_demo_2",
    operator: "IntrCity SmartBus",
    source: "Bangalore",
    destination: "Chennai",
    departureTime: new Date("2026-10-24T23:00:00Z"),
    arrivalTime: new Date("2026-10-25T05:30:00Z"),
    duration: "6h 30m",
    busType: "AC Seater (2+2)",
    price: 890,
    currency: "INR",
    busNumber: "IC-5521"
  },
  {
    id: "bus_demo_3",
    operator: "VRL Travels",
    source: "Mumbai",
    destination: "Pune",
    departureTime: new Date("2026-10-24T10:00:00Z"),
    arrivalTime: new Date("2026-10-24T13:30:00Z"),
    duration: "3h 30m",
    busType: "Volvo AC Multi-Axle",
    price: 650,
    currency: "INR",
    busNumber: "VRL-992"
  }
];

const getBusDelegate = () => (prisma as any).bus;

const filterBuses = (source?: string, destination?: string) =>
  demoBuses.filter((bus) => {
    const sourceOk = source
      ? bus.source.toLowerCase().includes(source.toLowerCase())
      : true;
    const destinationOk = destination
      ? bus.destination.toLowerCase().includes(destination.toLowerCase())
      : true;
    return sourceOk && destinationOk;
  });

export const busController = {
  all: async (_req: Request, res: Response) => {
    const busDelegate = getBusDelegate();
    const data = busDelegate
      ? await busDelegate.findMany({ orderBy: { departureTime: "asc" } })
      : filterBuses();
    res.status(200).json(ok(data, "All buses fetched"));
  },

  search: async (req: Request, res: Response) => {
    const source = req.query.source ? String(req.query.source) : undefined;
    const destination = req.query.destination ? String(req.query.destination) : undefined;

    const busDelegate = getBusDelegate();
    const buses = busDelegate
      ? await busDelegate.findMany({
          where: {
            ...(source ? { source: { contains: source } } : {}),
            ...(destination ? { destination: { contains: destination } } : {})
          }
        })
      : filterBuses(source, destination);

    res.status(200).json(ok(buses, "Buses fetched"));
  }
};
