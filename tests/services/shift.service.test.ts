import { ShiftService } from "../../src/services/shift.service";
import { prisma } from "../../src/core/config/prisma";
import { redisClient } from "../../src/core/config/redis";
import { haversineDistance } from "../../src/core/utils/geo";
import { ForbiddenError } from "../../src/core/errors/AppError";

jest.mock("../../src/core/config/prisma", () => ({
    prisma: {
        driver: {
            findUnique: jest.fn(),
        },
        $executeRaw: jest.fn().mockResolvedValue(true),
        vehicleLocation: {
            updateMany: jest.fn().mockResolvedValue(true),
        }
    }
}));

jest.mock("../../src/core/config/redis", () => ({
    redisClient: {
        geoadd: jest.fn().mockResolvedValue(1),
        zrem: jest.fn().mockResolvedValue(1),
        duplicate: jest.fn(),
        on: jest.fn()
    },
    pubClient: {},
    subClient: {}
}));

jest.mock("../../src/core/utils/geo", () => ({
    haversineDistance: jest.fn(),
}));

describe("ShiftService", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("startShift", () => {
        it("should throw ForbiddenError if driver is not verified", async () => {
            (prisma.driver.findUnique as jest.Mock).mockResolvedValue({ id: "drv_1", isVerified: false });

            await expect(ShiftService.startShift("drv_1", 11.2543, 124.9945)).rejects.toThrow(ForbiddenError);
        });

        it("should start shift successfully if driver is verified and within terminal radius", async () => {
            (prisma.driver.findUnique as jest.Mock).mockResolvedValue({ id: "drv_1", isVerified: true });
            (haversineDistance as jest.Mock).mockReturnValue(100);

            const result = await ShiftService.startShift("drv_1", 11.2543, 124.9945);

            expect(result).toEqual({ driverId: "drv_1", coords: { lat: 11.2543, lng: 124.9945 } });
            expect(redisClient.geoadd).toHaveBeenCalledWith("active_drivers", 124.9945, 11.2543, "drv_1");
        });
    });
});
