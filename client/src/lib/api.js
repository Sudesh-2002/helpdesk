import axios from "axios";

export const api = axios.create({ baseURL: "/api", withCredentials: true });

export const errMsg = (err) => err?.response?.data?.message || "Something went wrong";