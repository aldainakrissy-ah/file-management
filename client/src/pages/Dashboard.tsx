import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Snackbar,
  Alert,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import AddIcon from "@mui/icons-material/Add";
import { api, apiErrorMessage } from "../api/client";
import type { DocumentsListResponse, DocumentSummary } from "../api/types";
import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<DocumentSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await api.get<DocumentsListResponse>("/documents");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<DocumentSummary>("/documents", {});
      return res.data;
    },
    onSuccess: (doc) => navigate(`/documents/${doc.id}`),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<DocumentSummary>("/documents/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
    onSuccess: (doc) => navigate(`/documents/${doc.id}`),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const renameMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      await api.patch(`/documents/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setRenameTarget(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setDeleteTarget(null);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = "";
  }

  function renderList(docs: DocumentSummary[] | undefined, emptyLabel: string) {
    if (!docs || docs.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
          {emptyLabel}
        </Typography>
      );
    }
    return (
      <List>
        {docs.map((doc) => (
          <ListItem
            key={doc.id}
            secondaryAction={
              doc.role === "owner" ? (
                <Box>
                  <IconButton
                    edge="end"
                    aria-label="rename"
                    onClick={() => {
                      setRenameTarget(doc);
                      setRenameValue(doc.title);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => setDeleteTarget(doc)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : null
            }
            disablePadding
          >
            <ListItemButton onClick={() => navigate(`/documents/${doc.id}`)}>
              <ListItemText
                primary={doc.title}
                secondary={
                  doc.role === "owner"
                    ? `Updated ${new Date(doc.updatedAt).toLocaleString()}`
                    : `Shared by ${doc.ownerName} · Updated ${new Date(doc.updatedAt).toLocaleString()}`
                }
              />
              {doc.role !== "owner" && (
                <Chip
                  size="small"
                  label={doc.role === "edit" ? "Can edit" : "View only"}
                  color={doc.role === "edit" ? "primary" : "default"}
                  sx={{ ml: 2 }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  }

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6">Ajaia Docs</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.name}
            </Typography>
            <Button size="small" onClick={logout}>
              Log out
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            New Document
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
          >
            Import file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            hidden
            onChange={handleFileChange}
          />
        </Box>

        {isLoading ? (
          <Typography>Loading…</Typography>
        ) : (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 3 }}>
              My Documents
            </Typography>
            {renderList(data?.owned, "You don't own any documents yet.")}

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mt: 4 }}>
              Shared with Me
            </Typography>
            {renderList(data?.shared, "No documents have been shared with you.")}
          </>
        )}
      </Container>

      <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)}>
        <DialogTitle>Rename document</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!renameValue.trim() || renameMutation.isPending}
            onClick={() =>
              renameTarget &&
              renameMutation.mutate({ id: renameTarget.id, title: renameValue.trim() })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete "{deleteTarget?.title}". This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
