import { prisma } from "../config/prisma.js";
import { logger } from "../utils/logger.js";

const demoTrains = [
  {
    operator: "Rajdhani Express",
    source: "Delhi",
    destination: "Mumbai",
    departureTime: new Date("2026-10-24T16:30:00Z"),
    arrivalTime: new Date("2026-10-25T08:30:00Z"),
    duration: "16h 00m",
    classType: "1AC",
    price: 4500,
    trainNumber: "12952",
  },
  {
    operator: "Shatabdi Express",
    source: "Delhi",
    destination: "Chandigarh",
    departureTime: new Date("2026-10-24T07:40:00Z"),
    arrivalTime: new Date("2026-10-24T11:05:00Z"),
    duration: "3h 25m",
    classType: "CC",
    price: 1200,
    trainNumber: "12045",
  },
  {
    operator: "Tejas Express",
    source: "Mumbai",
    destination: "Ahmedabad",
    departureTime: new Date("2026-10-24T15:40:00Z"),
    arrivalTime: new Date("2026-10-24T21:55:00Z"),
    duration: "6h 15m",
    classType: "EC",
    price: 2200,
    trainNumber: "82901",
  }
];

const demoBuses = [
  {
    operator: "Zingbus",
    source: "Delhi",
    destination: "Manali",
    departureTime: new Date("2026-10-24T20:00:00Z"),
    arrivalTime: new Date("2026-10-25T09:00:00Z"),
    duration: "13h 00m",
    busType: "AC Sleeper (2+1)",
    price: 1350,
    busNumber: "ZB-1024",
  },
  {
    operator: "IntrCity SmartBus",
    source: "Bangalore",
    destination: "Chennai",
    departureTime: new Date("2026-10-24T23:00:00Z"),
    arrivalTime: new Date("2026-10-25T05:30:00Z"),
    duration: "6h 30m",
    busType: "AC Seater (2+2)",
    price: 890,
    busNumber: "IC-5521",
  },
  {
    operator: "VRL Travels",
    source: "Mumbai",
    destination: "Pune",
    departureTime: new Date("2026-10-24T10:00:00Z"),
    arrivalTime: new Date("2026-10-24T13:30:00Z"),
    duration: "3h 30m",
    busType: "Volvo AC Multi-Axle",
    price: 650,
    busNumber: "VRL-992",
  }
];

export const seedTransportData = async () => {
  try {
    const trainCount = await prisma.train.count();
    if (trainCount === 0) {
      logger.info("No trains found. Seeding demo trains...");
      for (const train of demoTrains) {
         await prisma.train.create({ data: train as any });
      }
      logger.info(`Seeded ${demoTrains.length} demo trains.`);
    }

    const busCount = await prisma.bus.count();
    if (busCount === 0) {
      logger.info("No buses found. Seeding demo buses...");
      for (const bus of demoBuses) {
        await prisma.bus.create({ data: bus as any });
      }
      logger.info(`Seeded ${demoBuses.length} demo buses.`);
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to seed transport data");
  }
};
