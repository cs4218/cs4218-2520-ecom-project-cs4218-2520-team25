import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController } from "../controllers/authController.js";

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
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

const makeOrder = (overrides = {}) => ({
  _id: "order-1",
  products: [
    {
      _id: "prod-1",
      name: "Laptop",
      price: 2000
    }
  ],
  buyer: {
    _id: 1,
    name: "Bob"
  },
  payment: { method: "card", amount: 2000 },
  status: "Processing",
  createdAt: new Date(),
  updatedAt: new Date(),
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

        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    })

    it("Should update name, phone, password and address successfully", async () => {
        const req = mockReq({
            body: {
                name: "bobby", 
                password: "longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            user: {_id: 1}});
    
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());

        hashPassword.mockResolvedValue("hashed-longpassword")
        
        const updatedUser = makeUser({
            name: "bobby", 
            password: "hashed-longpassword", 
            phone: 91234567,
            address: {home: "yes"}
        })
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);


        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(hashPassword).toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            1,
            {
                name: "bobby", 
                password: "hashed-longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            { new: true }
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Profile Updated SUccessfully",
            updatedUser: updatedUser
        });
    });

    it("Should use defaults successfully", async () => {
        const req = mockReq({
            body: {
                name: "bobby", 
                phone: 91234567,
                address: {home: "yes"}
            },
            user: {_id: 1}});
    
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());
        
        const updatedUser = makeUser({
            name: "bobby", 
            phone: 91234567,
            address: {home: "yes"}
        })
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);


        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            1,
            {
                name: "bobby", 
                password: "password", 
                phone: 91234567,
                address: {home: "yes"}
            },
            { new: true }
        )

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Profile Updated SUccessfully",
            updatedUser: updatedUser
        });
    });

        it("Should return 400 if update throws error", async () => {
        const req = mockReq({
            body: {
                name: "bobby", 
                password: "longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            user: {_id: 1}});
    
        const res = mockRes();

        userModel.findById.mockResolvedValue(makeUser());

        hashPassword.mockResolvedValue("hashed-longpassword")
        
        const updatedUser = makeUser({
            name: "bobby", 
            password: "hashed-longpassword", 
            phone: 91234567,
            address: {home: "yes"}
        });

        const error = Error("User update failed!");
        userModel.findByIdAndUpdate.mockRejectedValue(error);


        await updateProfileController(req, res);
        expect(userModel.findById).toHaveBeenCalledWith(1);
        expect(hashPassword).toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            1,
            {
                name: "bobby", 
                password: "hashed-longpassword", 
                phone: 91234567,
                address: {home: "yes"}
            },
            { new: true }
        )

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error WHile Update profile",
            error,
        });
    })
})

describe("getOrdersController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("Should get orders successfully", async () => {
        const fakeOrders = [makeOrder()]
        orderModel.find.mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            then: (resolve) => resolve(fakeOrders),
        }));

        const req = mockReq();
        const res = mockRes();

        await getOrdersController(req, res)

        expect(res.json).toHaveBeenCalledWith(fakeOrders)
    })

    it("Should throw 500 when there is an error", async () => {
        const error = Error("Invalid User ID");
        orderModel.find.mockImplementation(() => ({
            populate: jest.fn().mockReturnThis(),
            then: (_resolve, reject) => reject(error)
        }));
        const req = mockReq({user: {_id: 1}});
        const res = mockRes();

        await getOrdersController(req, res)

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error WHile Geting Orders",
            error,
        })
    })
})