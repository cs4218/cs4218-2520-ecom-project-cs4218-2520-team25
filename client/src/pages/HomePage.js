import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Prices } from "../components/Prices";
import { useCart } from "../context/cart";
import axios from "axios";
import toast from "react-hot-toast";
import Layout from "./../components/Layout";
import "../styles/Homepages.css";


// Han Tae Won (A0221684E)

const HomePage = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [checked, setChecked] = useState([]);
  const [radio, setRadio] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const safeText = (value) => {
    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }
    return "";
  };

  const normalizeProduct = (p) => ({
    ...p,
    _id: safeText(p?._id),
    name: safeText(p?.name),
    description: safeText(p?.description),
    price: typeof p?.price === "number" ? p.price : Number(p?.price) || 0,
    slug: safeText(p?.slug),
  });

  const normalizeCategory = (c) => ({
    ...c,
    _id: safeText(c?._id),
    name: safeText(c?.name),
  });

  const getAllCategory = async () => {
    try {
      const { data } = await axios.get("/api/v1/category/get-category");
      if (data?.success && Array.isArray(data?.category)) {
        setCategories(data.category.map(normalizeCategory));
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.log(error);
      setCategories([]);
    }
  };

  const getTotal = async () => {
    try {
      const { data } = await axios.get("/api/v1/product/product-count");
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (error) {
      console.log(error);
      setTotal(0);
    }
  };

  const getAllProducts = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/v1/product/product-list/${page}`);
      const nextProducts = Array.isArray(data?.products)
        ? data.products.map(normalizeProduct)
        : [];
      setProducts(nextProducts);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
      setProducts([]);
    }
  };

  const loadMore = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/v1/product/product-list/${page}`);
      const nextProducts = Array.isArray(data?.products)
        ? data.products.map(normalizeProduct)
        : [];
      setProducts((prev) => [...prev, ...nextProducts]);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  const filterProduct = async () => {
    try {
      const { data } = await axios.post("/api/v1/product/product-filters", {
        checked,
        radio,
      });

      console.log("FILTER RESPONSE:", data);

      const cleanedProducts = Array.isArray(data?.products)
        ? data.products.map(normalizeProduct)
        : [];

      setProducts(cleanedProducts);
    } catch (error) {
      console.log(error);
      setProducts([]);
    }
  };

  const handleFilter = (isChecked, id) => {
    let all = [...checked];
    if (isChecked) {
      if (!all.includes(id)) {
        all.push(id);
      }
    } else {
      all = all.filter((c) => c !== id);
    }
    setChecked(all);
    setPage(1);
  };

  useEffect(() => {
    getAllCategory();
    getTotal();
  }, []);

  useEffect(() => {
    if (page === 1) return;
    loadMore();
  }, [page]);

  useEffect(() => {
    if (checked.length || radio.length) {
      filterProduct();
    } else {
      getAllProducts();
    }
  }, [checked, radio]);

  return (
    <Layout title={"ALL Products - Best offers "}>
      <img
        src="/images/Virtual.png"
        className="banner-img"
        alt="bannerimage"
        width={"100%"}
      />

      <div className="container-fluid row mt-3 home-page">
        <div className="col-md-3 filters">
          <h4 className="text-center">Filter By Category</h4>
          <div className="d-flex flex-column">
            {categories.map((c) => (
              <label key={c._id} style={{ marginBottom: "8px" }}>
                <input
                  type="checkbox"
                  checked={checked.includes(c._id)}
                  onChange={(e) => handleFilter(e.target.checked, c._id)}
                  style={{ marginRight: "8px" }}
                />
                {c.name}
              </label>
            ))}
          </div>

          <h4 className="text-center mt-4">Filter By Price</h4>
          <div className="d-flex flex-column">
            {Prices?.map((p) => (
              <label key={safeText(p?._id)} style={{ marginBottom: "8px" }}>
                <input
                  type="radio"
                  name="priceFilter"
                  checked={JSON.stringify(radio) === JSON.stringify(p.array)}
                  onChange={() => {
                    setRadio(Array.isArray(p.array) ? p.array : []);
                    setPage(1);
                  }}
                  style={{ marginRight: "8px" }}
                />
                {safeText(p?.name)}
              </label>
            ))}
          </div>

          <div className="d-flex flex-column">
            <button
              className="btn btn-danger"
              onClick={() => window.location.reload()}
            >
              RESET FILTERS
            </button>
          </div>
        </div>

        <div className="col-md-9">
          <h1 className="text-center">All Products</h1>
          <div className="d-flex flex-wrap">
            {products.map((p) => (
              <div className="card m-2" key={p._id}>
                <img
                  src={`/api/v1/product/product-photo/${p._id}`}
                  className="card-img-top"
                  alt={p.name}
                />
                <div className="card-body">
                  <div className="card-name-price">
                    <h5 className="card-title">{p.name}</h5>
                    <h5 className="card-title card-price">
                      {p.price.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </h5>
                  </div>
                  <p className="card-text">{p.description.substring(0, 60)}...</p>
                  <div className="card-name-price">
                    <button
                      className="btn btn-info ms-1"
                      onClick={() => navigate(`/product/${p.slug}`)}
                    >
                      More Details
                    </button>
                    <button
                      className="btn btn-dark ms-1"
                      onClick={() => {
                        setCart([...cart, p]);
                        localStorage.setItem("cart", JSON.stringify([...cart, p]));
                        toast.success("Item Added to cart");
                      }}
                    >
                      ADD TO CART
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="m-2 p-3">
            {products.length < total && (
              <button
                className="btn loadmore"
                onClick={(e) => {
                  e.preventDefault();
                  setPage(page + 1);
                }}
              >
                {loading ? "Loading ..." : "Loadmore"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;