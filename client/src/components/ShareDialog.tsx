import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { api, apiErrorMessage } from "../api/client";
import type { Share } from "../api/types";

export default function ShareDialog({
  documentId,
  open,
  onClose,
}: {
  documentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [error, setError] = useState<string | null>(null);

  const { data: shares } = useQuery({
    queryKey: ["shares", documentId],
    queryFn: async () => {
      const res = await api.get<Share[]>(`/documents/${documentId}/shares`);
      return res.data;
    },
    enabled: open,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/documents/${documentId}/share`, { userEmail: email, permission });
    },
    onSuccess: () => {
      setEmail("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["shares", documentId] });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/documents/${documentId}/share/${userId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shares", documentId] }),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Share document</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 2 }}>
          <TextField
            label="User email"
            size="small"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            size="small"
            value={permission}
            onChange={(e) => setPermission(e.target.value as "view" | "edit")}
          >
            <MenuItem value="view">View</MenuItem>
            <MenuItem value="edit">Edit</MenuItem>
          </Select>
          <Button
            variant="contained"
            disabled={!email.trim() || shareMutation.isPending}
            onClick={() => shareMutation.mutate()}
          >
            Share
          </Button>
        </Box>

        <Typography variant="subtitle2" color="text.secondary">
          People with access
        </Typography>
        <List dense>
          {shares?.length ? (
            shares.map((s) => (
              <ListItem
                key={s.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => revokeMutation.mutate(s.userId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText primary={`${s.name} (${s.email})`} secondary={s.permission} />
              </ListItem>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              Not shared with anyone yet.
            </Typography>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
