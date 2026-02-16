import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController } from "../controllers/authController.js";

jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

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

const makeUser = (overrides = {}) => ({
        name: "bob",
        email: "bob@gmail.com",
        password: "password",
        phone: "92156584",
        address: {},
        answer: "wat",
        role: 0,
        ...overrides
    });

describe("updateProfileController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("Should reject short password", async () => {
        const shortPasswordReq = mockReq({body: {password: "abc"}, user: {_id: 1}});
        const res = mockRes();
        userModel.findById.mockResolvedValue(makeUser());
        await updateProfileController(shortPasswordReq, res);
        
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({ error: "Passsword is required and 6 character long" });

        // no update should occur
        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    })

    it("Should call findById", async () => {
        const req = mockReq({body: {password: "longpassword"}, user: {_id: 1}});
        const res = mockRes();
        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
    })

    it("Should call hashPassword if password is present", async () => {
        const req = mockReq({body: {password: "longpassword"}, user: {_id: 1}});
        const res = mockRes();
        await updateProfileController(req, res);
        expect(hashPassword).toHaveBeenCalledWith("longpassword");
    })

    it("Should call findByIdAndUpdate if password is present", async () => {
        const req = mockReq({body: {password: "longpassword"}, user: {_id: 1}});
        const res = mockRes();
        await updateProfileController(req, res);
        expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
    })

})