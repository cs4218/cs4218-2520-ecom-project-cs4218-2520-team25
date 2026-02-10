import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController } from "../controllers/authController.js";

jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

import userModel from "../models/userModel.js";

const mockReq = (overrides = {}) => ({
    body: {},
    params: {},
    user: {},
    ...overrides
})

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("updateProfileController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const fakeUser = {
            name: "bob",
            email: "bob@gmail.com",
            password: "password",
            phone: "92156584",
            address: {},
            answer: "wat",
            role: 0
        }

        userModel.findById.mockResolvedValue(fakeUser);
    });

    it("Should reject short password", async () => {
        const shortPasswordReq = mockReq({body: {password: "abc"}});
        const res = mockRes();
        await updateProfileController(shortPasswordReq, res)
        expect(res.json).toHaveBeenCalledWith({ error: "Passsword is required and 6 character long" })
    })
    
    it("Should call findById", async () => {
        const req = mockReq({body: {password: "longpassword"}, user: {_id: 1}});
        const res = mockRes();
        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
    })
})