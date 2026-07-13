import { Editor } from "@tiptap/react";
import { Box, MenuItem, Select, ToggleButton, ToggleButtonGroup } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";

export default function EditorToolbar({ editor }: { editor: Editor }) {
  const headingValue = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
    ? "2"
    : editor.isActive("heading", { level: 3 })
    ? "3"
    : "0";

  function setHeading(value: string) {
    if (value === "0") {
      editor.chain().focus().setParagraph().run();
    } else {
      editor
        .chain()
        .focus()
        .toggleHeading({ level: Number(value) as 1 | 2 | 3 })
        .run();
    }
  }

  const marks: string[] = [];
  if (editor.isActive("bold")) marks.push("bold");
  if (editor.isActive("italic")) marks.push("italic");
  if (editor.isActive("underline")) marks.push("underline");

  const lists: string[] = [];
  if (editor.isActive("bulletList")) lists.push("bulletList");
  if (editor.isActive("orderedList")) lists.push("orderedList");

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", py: 1 }}>
      <Select size="small" value={headingValue} onChange={(e) => setHeading(e.target.value)}>
        <MenuItem value="0">Normal text</MenuItem>
        <MenuItem value="1">Heading 1</MenuItem>
        <MenuItem value="2">Heading 2</MenuItem>
        <MenuItem value="3">Heading 3</MenuItem>
      </Select>

      <ToggleButtonGroup size="small" value={marks}>
        <ToggleButton
          value="bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <FormatUnderlinedIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>

      <ToggleButtonGroup size="small" value={lists}>
        <ToggleButton
          value="bulletList"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToggleButton>
        <ToggleButton
          value="orderedList"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon fontSize="small" />
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
