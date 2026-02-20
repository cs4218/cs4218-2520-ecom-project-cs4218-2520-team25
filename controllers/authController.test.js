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
        expect(res.json).toHaveBeenCalledWith({ error: "Password is required and at least 6 characters long" });

        expect(hashPassword).not.toHaveBeenCalled();
        expect(userModel.findByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });


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
            message: "Profile Updated Successfully",
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
            message: "Profile Updated Successfully",
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
            message: "Error While Updating profile",
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
        const query = {
            populate: jest.fn().mockReturnThis(),
            then: (resolve) => resolve(fakeOrders),
        }
        orderModel.find.mockReturnValue(query);

        const req = mockReq({user:{_id:1}});
        const res = mockRes();

        await getOrdersController(req, res);

        expect(orderModel.find).toHaveBeenCalledWith({buyer: 1});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");

        expect(res.json).toHaveBeenCalledWith(fakeOrders)
    })

    it("Should throw 500 when there is an error", async () => {
        const error = Error("Invalid User ID");
        const query = {
            populate: jest.fn().mockReturnThis(),
            then: (_resolve, reject) => reject(error)
        };
        orderModel.find.mockReturnValue(query);
        const req = mockReq({user: {_id: 1}});
        const res = mockRes();

        await getOrdersController(req, res)

        expect(orderModel.find).toHaveBeenCalledWith({buyer: 1});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error,
        });

        expect(res.json).not.toHaveBeenCalled();
    })
});

describe("getAllOrdersController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should fetch all orders, populate products and buyer, sort by createdAt desc, and return via res.json", async () => {
        // arrange
        const fakeOrders = [
            makeOrder({ _id: "order-1" }),
            makeOrder({ _id: "order-2", status: "Shipped" }),
        ];

        const req = mockReq();
        const res = mockRes();

        const query = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            then: (resolve) => resolve(fakeOrders),
        };
        orderModel.find.mockReturnValue(query);

        // act
        await getAllOrdersController(req, res);

        // assert: query chain
        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
        expect(query.sort).toHaveBeenCalledWith({ createdAt: "-1" });

        // assert: response
        expect(res.json).toHaveBeenCalledWith(fakeOrders);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });
    it("Should throw 500 when there is an error", async () => {
        const error = Error("Invalid User ID");
        const query = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            then: (_resolve, reject) => reject(error),
        };

        orderModel.find.mockReturnValue(query);
        const req = mockReq();
        const res = mockRes();

        await getAllOrdersController(req, res)

        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(query.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
        expect(query.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
        expect(query.sort).toHaveBeenCalledWith({ createdAt: "-1" });

        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Getting Orders",
            error,
        });
    })
});

describe("orderStatusController", () => {
    beforeEach(()=> {
        jest.clearAllMocks();
    });

    it("should update order status when given orderId and status", async () => {
        const res = mockRes();
        const req = mockReq({
            params: { orderId: "order-123" },
            body: { status: "Completed"}, 
        });

        const updated = makeOrder({ _id: "order-123", status: "Completed" });
        orderModel.findByIdAndUpdate.mockResolvedValue(updated);

        await orderStatusController(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "order-123",
            { status: "Completed" },
            {new: true}
        );
        expect(res.json).toHaveBeenCalledWith(updated);
    });

    it("should catch synchronous throws from findByIdAndUpdate and return 500", async () => {
        // Rare, but useful to prove try/catch catches sync throws too.
        const req = mockReq({
            params: { orderId: "order-123" },
            body: { status: "Processing" },
        });
        const res = mockRes();

        const err = new Error("sync throw");
        orderModel.findByIdAndUpdate.mockImplementation(() => {
            throw err;
        });

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error While Updating Order",
            error: err,
        });
        expect(res.json).not.toHaveBeenCalled();
    });
})