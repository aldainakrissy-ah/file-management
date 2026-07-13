import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  TextField,
  Toolbar as MuiToolbar,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { api, apiErrorMessage } from "../api/client";
import type { DocumentSummary } from "../api/types";
import EditorToolbar from "../components/EditorToolbar";
import ShareDialog from "../components/ShareDialog";

type SaveStatus = "idle" | "saving" | "saved" | "error";

function useDebouncedCallback<T extends unknown[]>(fn: (...args: T) => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: T) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fn(...args), delay);
  };
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loadedDocId = useRef<string | null>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const res = await api.get<DocumentSummary>(`/documents/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: "",
    editable: false,
    onUpdate: () => {
      if (!doc || doc.role === "view") return;
      setSaveStatus("saving");
      debouncedSaveContent();
    },
  });

  const debouncedSaveContent = useDebouncedCallback(async () => {
    if (!editor || !id) return;
    try {
      await api.patch(`/documents/${id}`, { content: editor.getJSON() });
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setErrorMsg(apiErrorMessage(err));
    }
  }, 1500);

  const debouncedSaveTitle = useDebouncedCallback(async (newTitle: string) => {
    if (!id) return;
    try {
      setSaveStatus("saving");
      await api.patch(`/documents/${id}`, { title: newTitle });
      setSaveStatus("saved");
    } catch (err) {
      setSaveStatus("error");
      setErrorMsg(apiErrorMessage(err));
    }
  }, 1500);

  useEffect(() => {
    if (!doc || !editor || loadedDocId.current === doc.id) return;
    editor.commands.setContent(doc.content as object);
    editor.setEditable(doc.role !== "view");
    setTitle(doc.title);
    loadedDocId.current = doc.id;
  }, [doc, editor]);

  if (isLoading || !doc || !editor) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Loading…</Typography>
      </Container>
    );
  }

  const canEdit = doc.role !== "view";
  const isOwner = doc.role === "owner";

  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <MuiToolbar sx={{ display: "flex", gap: 2 }}>
          <IconButton onClick={() => navigate("/documents")}>
            <ArrowBackIcon />
          </IconButton>
          <TextField
            variant="standard"
            value={title}
            disabled={!isOwner}
            onChange={(e) => {
              setTitle(e.target.value);
              if (e.target.value.trim()) {
                setSaveStatus("saving");
                debouncedSaveTitle(e.target.value.trim());
              }
            }}
            sx={{ flex: 1 }}
            slotProps={{ input: { disableUnderline: !isOwner, sx: { fontSize: 20 } } }}
          />
          {!canEdit && <Chip size="small" label="View only" />}
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Error saving"}
          </Typography>
          {isOwner && (
            <Button variant="outlined" size="small" onClick={() => setShareOpen(true)}>
              Share
            </Button>
          )}
        </MuiToolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {canEdit && <EditorToolbar editor={editor} />}
        {errorMsg && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {errorMsg}
          </Typography>
        )}
        <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 2 }}>
          <EditorContent editor={editor} />
        </Box>
      </Container>

      {isOwner && (
        <ShareDialog documentId={doc.id} open={shareOpen} onClose={() => setShareOpen(false)} />
      )}
    </Box>
  );
}
