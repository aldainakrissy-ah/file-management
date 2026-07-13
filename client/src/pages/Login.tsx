import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import { api, apiErrorMessage } from "../api/client";
import type { User } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<User[]>("/users");
      return res.data;
    },
  });

  async function handleLogin() {
    if (!selectedUserId) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(selectedUserId);
      navigate("/documents");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#f5f5f7",
      }}
    >
      <Paper sx={{ p: 4, width: 360 }} elevation={3}>
        <Typography variant="h5" gutterBottom>
          Ajaia Docs
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Log in as a seeded user
        </Typography>

        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <Select
          fullWidth
          displayEmpty
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          disabled={isLoading}
          sx={{ my: 2 }}
        >
          <MenuItem value="" disabled>
            Select a user
          </MenuItem>
          {users?.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.name} ({u.email})
            </MenuItem>
          ))}
        </Select>

        <Button
          fullWidth
          variant="contained"
          disabled={!selectedUserId || submitting}
          onClick={handleLogin}
        >
          Log in
        </Button>
      </Paper>
    </Box>
  );
}
