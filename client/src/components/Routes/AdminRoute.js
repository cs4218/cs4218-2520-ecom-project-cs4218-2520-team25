import { useState, useEffect } from "react";
import { useAuth } from "../../context/auth";
import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import Spinner from "../Spinner";

// Daniel Loh, A0252099X
// Handle logged out state

export default function AdminRoute() {
    const [ok, setOk] = useState(false);
    const [auth, setAuth] = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const authCheck = async () => {
            try {
                const res = await axios.get("/api/v1/auth/admin-auth");
                if (res.data?.ok) {
                    setOk(true);
                } else {
                    // not authorized — clear auth and redirect
                    setOk(false);
                    setAuth({});
                    localStorage.removeItem("auth");
                    navigate("/login");
                }
            } catch (err) {
                // server error or network error — clear auth and redirect to login
                setOk(false);
                setAuth({});
                localStorage.removeItem("auth");
                navigate("/login");
            }
        };

        if (auth?.token) {
            authCheck();
        } else {
            setOk(false);
        }
    }, [auth?.token, navigate, setAuth]);

    return ok ? <Outlet /> : <Spinner />;
}