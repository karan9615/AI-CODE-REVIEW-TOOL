import axios from "axios";
export const client = (token) =>
  axios.create({
    baseURL: "https://gitlab.com/api/v4",
    headers: { Authorization: `Bearer ${token}` },
  });
