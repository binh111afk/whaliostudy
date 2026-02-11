import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { documentService } from "../services/documentService";
import { UploadModal, EditDocModal } from "../components/DocumentModals";
import {
  Search,
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  File as FileIcon,
  Eye,
  Edit3,
  Trash2,
  Bookmark,
  Globe,
  Lock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Star,
  Check,
} from "lucide-react";

// --- PASTE ĐOẠN NÀY VÀO TRƯỚC COMPONENT Documents ---
const FileThumbnail = ({ type, size = "md" }) => {
  const ext = (type || "other").toLowerCase();

  // Logic Gom Nhóm (Mapping thông minh)
  let iconType = "other";
  if (["doc", "docx", "word", "msword"].includes(ext)) iconType = "word";
  else if (["xls", "xlsx", "csv", "excel", "spreadsheet"].includes(ext))
    iconType = "excel";
  else if (["ppt", "pptx", "powerpoint", "presentation", "slide"].includes(ext))
    iconType = "ppt";
  else if (["pdf"].includes(ext)) iconType = "pdf";
  else if (["txt", "rtf", "text"].includes(ext)) iconType = "txt";
  else if (["zip", "rar", "7z", "tar", "gz", "archive"].includes(ext))
    iconType = "zip";
  else if (["jpg", "jpeg"].includes(ext)) iconType = "jpg";
  else if (["png", "webp", "gif", "svg", "image"].includes(ext))
    iconType = "png";

  const dim = size === "lg" ? 64 : 48; // Tăng size md lên 48px cho khớp với grid cũ

  const icons = {
    pdf: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#F15642" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M101.744,303.152c0-4.224,3.328-8.832,8.688-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.688-3.184-8.688-8.816V303.152z M118.624,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504c0-8.944-6.784-16.368-15.36-16.368H118.624z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M196.656,384c-4.224,0-8.832-2.304-8.832-7.92v-72.672c0-4.592,4.608-7.936,8.832-7.936h29.296 c58.464,0,57.184,88.528,1.152,88.528H196.656z M204.72,311.088V368.4h21.232c34.544,0,36.08-57.312,0-57.312H204.72z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M303.872,312.112v20.336h32.624c4.608,0,9.216,4.608,9.216,9.072c0,4.224-4.608,7.68-9.216,7.68 h-32.624v26.864c0,4.48-3.184,7.92-7.664,7.92c-5.632,0-9.072-3.44-9.072-7.92v-72.672c0-4.592,3.456-7.936,9.072-7.936h44.912 c5.632,0,8.96,3.344,8.96,7.936c0,4.096-3.328,8.704-8.96,8.704h-37.248V312.112z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    word: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#50BEE8" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M92.576,384c-4.224,0-8.832-2.32-8.832-7.936v-72.656c0-4.608,4.608-7.936,8.832-7.936h29.296 c58.464,0,57.168,88.528,1.136,88.528H92.576z M100.64,311.072v57.312h21.232c34.544,0,36.064-57.312,0-57.312H100.64z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M228,385.28c-23.664,1.024-48.24-14.72-48.24-46.064c0-31.472,24.56-46.944,48.24-46.944 c22.384,1.136,45.792,16.624,45.792,46.944C273.792,369.552,250.384,385.28,228,385.28z M226.592,308.912 c-14.336,0-29.936,10.112-29.936,30.32c0,20.096,15.616,30.336,29.936,30.336c14.72,0,30.448-10.24,30.448-30.336 C257.04,319.008,241.312,308.912,226.592,308.912z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M288.848,339.088c0-24.688,15.488-45.92,44.912-45.92c11.136,0,19.968,3.328,29.296,11.392 c3.456,3.184,3.84,8.816,0.384,12.4c-3.456,3.056-8.704,2.688-11.776-0.384c-5.232-5.504-10.608-7.024-17.904-7.024 c-19.696,0-29.152,13.952-29.152,29.552c0,15.872,9.328,30.448,29.152,30.448c7.296,0,14.08-2.96,19.968-8.192 c3.952-3.072,9.456-1.552,11.76,1.536c2.048,2.816,3.056,7.552-1.408,12.016c-8.96,8.336-19.696,10-30.336,10 C302.8,384.912,288.848,363.776,288.848,339.088z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    excel: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#84BD5A" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M144.336,326.192l22.256-27.888c6.656-8.704,19.584,2.416,12.288,10.736 c-7.664,9.088-15.728,18.944-23.408,29.04l26.096,32.496c7.04,9.6-7.024,18.8-13.936,9.328l-23.552-30.192l-23.152,30.848 c-6.528,9.328-20.992-1.152-13.696-9.856l25.712-32.624c-8.064-10.112-15.872-19.952-23.664-29.04 c-8.048-9.6,6.912-19.44,12.8-10.464L144.336,326.192z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M197.36,303.152c0-4.224,3.584-7.808,8.064-7.808c4.096,0,7.552,3.6,7.552,7.808v64.096h34.8 c12.528,0,12.8,16.752,0,16.752H205.44c-4.48,0-8.064-3.184-8.064-7.792v-73.056H197.36z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M272.032,314.672c2.944-24.832,40.416-29.296,58.08-15.728c8.704,7.024-0.512,18.16-8.192,12.528 c-9.472-6-30.96-8.816-33.648,4.464c-3.456,20.992,52.192,8.976,51.296,43.008c-0.896,32.496-47.968,33.248-65.632,18.672 c-4.24-3.456-4.096-9.072-1.792-12.544c3.328-3.312,7.024-4.464,11.392-0.88c10.48,7.152,37.488,12.528,39.392-5.648 C321.28,339.632,268.064,351.008,272.032,314.672z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    ppt: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#F15642" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M105.456,303.152c0-4.224,3.328-8.832,8.688-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.568,8.816-8.176,8.816c-4.224,0-8.688-3.184-8.688-8.816v-72.032 H105.456z M122.336,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504c0-8.944-6.784-16.368-15.36-16.368H122.336z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M191.616,303.152c0-4.224,3.328-8.832,8.704-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.704-3.184-8.704-8.816V303.152z M208.496,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504c0-8.944-6.784-16.368-15.36-16.368H208.496z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M301.68,311.472h-22.368c-11.136,0-11.136-16.368,0-16.368h60.496c11.392,0,11.392,16.368,0,16.368 h-21.232v64.608c0,11.12-16.896,11.392-16.896,0V311.472z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    txt: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#576D7E" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M132.784,311.472H110.4c-11.136,0-11.136-16.368,0-16.368h60.512c11.392,0,11.392,16.368,0,16.368 h-21.248v64.592c0,11.12-16.896,11.392-16.896,0v-64.592H132.784z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M224.416,326.176l22.272-27.888c6.656-8.688,19.568,2.432,12.288,10.752 c-7.68,9.088-15.728,18.944-23.424,29.024l26.112,32.496c7.024,9.6-7.04,18.816-13.952,9.344l-23.536-30.192l-23.152,30.832 c-6.528,9.328-20.992-1.152-13.68-9.856l25.696-32.624c-8.048-10.096-15.856-19.936-23.664-29.024 c-8.064-9.6,6.912-19.44,12.784-10.48L224.416,326.176z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M298.288,311.472H275.92c-11.136,0-11.136-16.368,0-16.368h60.496c11.392,0,11.392,16.368,0,16.368 h-21.232v64.592c0,11.12-16.896,11.392-16.896,0V311.472z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    zip: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#84BD5A" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M132.64,384c-8.064,0-11.264-7.792-6.656-13.296l45.552-60.512h-37.76 c-11.12,0-10.224-15.712,0-15.712h51.568c9.712,0,12.528,9.184,5.632,16.624l-43.632,56.656h41.584 c10.24,0,11.52,16.256-1.008,16.256h-55.28V384z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M212.048,303.152c0-10.496,16.896-10.88,16.896,0v73.04c0,10.608-16.896,10.88-16.896,0V303.152z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M251.616,303.152c0-4.224,3.328-8.832,8.704-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.704-3.184-8.704-8.816 L251.616,303.152L251.616,303.152z M268.496,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504 c0-8.944-6.784-16.368-15.36-16.368H268.496z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    jpg: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#50BEE8" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M141.968,303.152c0-10.752,16.896-10.752,16.896,0v50.528c0,20.096-9.6,32.256-31.728,32.256 c-10.88,0-19.952-2.96-27.888-13.184c-6.528-7.808,5.76-19.056,12.416-10.88c5.376,6.656,11.136,8.192,16.752,7.936 c7.152-0.256,13.44-3.472,13.568-16.128v-50.528H141.968z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M181.344,303.152c0-4.224,3.328-8.832,8.704-8.832H219.6c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.704-3.184-8.704-8.816 L181.344,303.152L181.344,303.152z M198.24,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504 c0-8.944-6.784-16.368-15.36-16.368H198.24z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M342.576,374.16c-9.088,7.552-20.224,10.752-31.472,10.752c-26.88,0-45.936-15.344-45.936-45.808 c0-25.824,20.096-45.904,47.072-45.904c10.112,0,21.232,3.44,29.168,11.248c7.792,7.664-3.456,19.056-11.12,12.288 c-4.736-4.608-11.392-8.064-18.048-8.064c-15.472,0-30.432,12.4-30.432,30.432c0,18.944,12.528,30.464,29.296,30.464 c7.792,0,14.448-2.32,19.184-5.76V348.08h-19.184c-11.392,0-10.24-15.616,0-15.616h25.584c4.736,0,9.072,3.584,9.072,7.552v27.248 C345.76,369.568,344.752,371.712,342.576,374.16z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
    png: (
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 512 512"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          style={{ fill: "#E2E5E7" }}
          d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z"
        />
        <path
          style={{ fill: "#B0B7BD" }}
          d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z"
        />
        <polygon
          style={{ fill: "#CAD1D8" }}
          points="480,224 384,128 480,128 "
        />
        <path
          style={{ fill: "#A066AA" }}
          d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z"
        />
        <g>
          <path
            style={{ fill: "#FFFFFF" }}
            d="M92.816,303.152c0-4.224,3.312-8.848,8.688-8.848h29.568c16.624,0,31.6,11.136,31.6,32.496 c0,20.224-14.976,31.472-31.6,31.472H109.68v16.896c0,5.648-3.552,8.832-8.176,8.832c-4.224,0-8.688-3.184-8.688-8.832 C92.816,375.168,92.816,303.152,92.816,303.152z M109.68,310.432v31.856h21.376c8.56,0,15.344-7.552,15.344-15.488 c0-8.96-6.784-16.368-15.344-16.368L109.68,310.432L109.68,310.432z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M178.976,304.432c0-4.624,1.024-9.088,7.68-9.088c4.592,0,5.632,1.152,9.072,4.464l42.336,52.976 v-49.632c0-4.224,3.696-8.848,8.064-8.848c4.608,0,9.072,4.624,9.072,8.848v72.016c0,5.648-3.456,7.792-6.784,8.832 c-4.464,0-6.656-1.024-10.352-4.464l-42.336-53.744v49.392c0,5.648-3.456,8.832-8.064,8.832s-8.704-3.184-8.704-8.832v-70.752 H178.976z"
          />
          <path
            style={{ fill: "#FFFFFF" }}
            d="M351.44,374.16c-9.088,7.536-20.224,10.752-31.472,10.752c-26.88,0-45.936-15.36-45.936-45.808 c0-25.84,20.096-45.92,47.072-45.92c10.112,0,21.232,3.456,29.168,11.264c7.808,7.664-3.456,19.056-11.12,12.288 c-4.736-4.624-11.392-8.064-18.048-8.064c-15.472,0-30.432,12.4-30.432,30.432c0,18.944,12.528,30.448,29.296,30.448 c7.792,0,14.448-2.304,19.184-5.76V348.08h-19.184c-11.392,0-10.24-15.632,0-15.632h25.584c4.736,0,9.072,3.6,9.072,7.568v27.248 C354.624,369.552,353.616,371.712,351.44,374.16z"
          />
        </g>
        <path
          style={{ fill: "#CAD1D8" }}
          d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z"
        />
      </svg>
    ),
  };

  return (
    <div className="shrink-0 flex items-center justify-center transition-transform hover:scale-105">
      {icons[iconType] || <FileText size={dim} className="text-gray-400" />}
    </div>
  );
};

// Danh sách môn học
const SUBJECTS = [
  { id: "all", name: "Tất cả" },
  { id: 1, name: "Cơ sở toán trong CNTT" },
  { id: 2, name: "Tâm lý học đại cương" },
  { id: 3, name: "Kinh tế chính trị" },
  { id: 4, name: "Chủ nghĩa xã hội" },
  { id: 5, name: "Tâm lý học giáo dục" },
  { id: 6, name: "Lập trình C++" },
  { id: 7, name: "Toán rời rạc" },
  { id: 8, name: "Xác suất thống kê" },
  { id: 9, name: "Triết học Mác Lenin" },
  { id: 10, name: "Pháp luật đại cương" },
  { id: 11, name: "Quân sự" },
  { id: "other", name: "Khác" },
];

const Documents = () => {
  const navigate = useNavigate();
  // 👇 THAY ĐỔI 1: Đưa user vào State để cập nhật không cần reload
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user"))
  );

  // --- STATE ---
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState(null);

  // --- FETCH DATA ---
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await documentService.getDocuments();
      // Filter: Chỉ hiện công khai HOẶC của chính mình (kể cả private)
      const validDocs = data.filter(
        (doc) =>
          doc.visibility !== "private" ||
          (currentUser && doc.uploaderUsername === currentUser.username)
      );
      setDocuments(validDocs);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []); // Chỉ chạy 1 lần khi mount, user thay đổi không cần load lại API documents

  // Reset trang khi đổi chế độ xem
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, searchTerm, filterSubject, filterType]);

  // --- FILTER LOGIC ---
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Lọc theo chế độ xem (Saved)
      // 👇 Dùng currentUser từ State để check realtime
      if (viewMode === "saved") {
        if (!currentUser?.savedDocs?.includes(doc.id)) return false;
      }

      // 2. Các bộ lọc khác
      const matchesSearch = doc.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSubject =
        filterSubject === "all" || String(doc.course) === String(filterSubject);
      const matchesType = filterType === "all" || doc.type === filterType;

      return matchesSearch && matchesSubject && matchesType;
    });
  }, [documents, searchTerm, filterSubject, filterType, viewMode, currentUser]);

  // --- PAGINATION ---
  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  const currentDocs = filteredDocs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- STATS ---
  const stats = useMemo(() => {
    const savedDocs = currentUser?.savedDocs || [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return {
      total: documents.length,
      saved: savedDocs.filter((id) => documents.find((d) => d.id === id))
        .length,
      new: documents.filter((d) => new Date(d.createdAt) > sevenDaysAgo).length,
    };
  }, [documents, currentUser]);

  // --- HANDLERS ---
  const handleUpload = async (formData) => {
    const res = await documentService.uploadDocument(formData);
    if (res.success) {
      alert("Tải lên thành công!");
      loadDocuments();
    } else {
      alert("Lỗi: " + res.message);
    }
  };

  const handleEdit = async (data) => {
    const res = await documentService.updateDocument({
      ...data,
      username: currentUser.username,
    });
    if (res.success) loadDocuments();
  };

  const handleDelete = async (docId) => {
    if (confirm("Xóa tài liệu này?")) {
      const res = await documentService.deleteDocument(
        docId,
        currentUser.username
      );
      if (res.success) loadDocuments();
    }
  };

  // 👇 THAY ĐỔI 2: Xử lý Lưu không reload trang
  const handleToggleSave = async (docId) => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");

    // Gọi API (Backend vẫn xử lý lưu vào DB)
    const res = await documentService.toggleSave(docId, currentUser.username);

    if (res.success) {
      // Cập nhật LocalStorage
      const updatedUser = { ...currentUser, savedDocs: res.savedDocs };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Cập nhật State -> React tự render lại giao diện -> KHÔNG RELOAD
      setCurrentUser(updatedUser);
    }
  };

  const handleView = async (doc) => {
    try {
      // 1. Tăng lượt xem ngay trong state (optimistic update)
      setDocuments(prevDocs => 
        prevDocs.map(d => 
          d.id === doc.id 
            ? { ...d, viewCount: (d.viewCount || 0) + 1 } 
            : d
        )
      );
      
      // 2. Gọi API tăng view
      await documentService.viewDocument(doc.id);
      
    } catch (error) {
      console.error("Lỗi khi tăng view:", error);
      // Nếu API thất bại, rollback lại state
      setDocuments(prevDocs => 
        prevDocs.map(d => 
          d.id === doc.id 
            ? { ...d, viewCount: Math.max((d.viewCount || 1) - 1, 0) } 
            : d
        )
      );
    }
    
    // 3. Chuyển đến trang xem tài liệu
    navigate(`/documents/${doc.id}`);
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "pdf":
        return { icon: FileText, color: "text-red-500", bg: "bg-red-50" };
      case "word":
        return { icon: FileText, color: "text-blue-500", bg: "bg-blue-50" };
      case "excel":
        return {
          icon: FileSpreadsheet,
          color: "text-green-500",
          bg: "bg-green-50",
        };
      case "image":
        return { icon: Image, color: "text-purple-500", bg: "bg-purple-50" };
      default:
        return { icon: FileIcon, color: "text-gray-500", bg: "bg-gray-50" };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* === LEFT SIDEBAR === */}
        <div className="space-y-8">
          {/* 1. Bộ lọc */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800">Bộ lọc</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tên tài liệu..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Môn học
                </label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none cursor-pointer"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Loại file
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none cursor-pointer"
                >
                  <option value="all">Tất cả</option>
                  <option value="pdf">PDF Document</option>
                  <option value="word">Microsoft Word</option>
                  <option value="ppt">PowerPoint</option>
                  <option value="image">Hình ảnh</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Thống kê */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800">Thống kê</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <span className="text-sm text-gray-600">Tổng tài liệu</span>
                <span className="font-bold text-gray-800">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <span className="text-sm text-gray-600">Đã lưu</span>
                <span className="font-bold text-blue-600">{stats.saved}</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-sm text-gray-600">Mới (7 ngày)</span>
                <span className="font-bold text-green-600">{stats.new}</span>
              </div>
            </div>
          </div>

          {/* 3. Thư viện cá nhân */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-800">Thư viện</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden p-2 space-y-1">
              <button
                onClick={() => setViewMode("all")}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "all"
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid size={18} /> Kho tài liệu chung
                </span>
                {viewMode === "all" && <Check size={16} />}
              </button>
              <button
                onClick={() => setViewMode("saved")}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === "saved"
                    ? "bg-orange-50 text-orange-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Star size={18} /> Tài liệu đã lưu
                </span>
                {viewMode === "saved" && <Check size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* === MAIN CONTENT === */}
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {viewMode === "saved" ? (
                <>
                  <Star className="text-orange-500 fill-orange-500" /> Tài liệu
                  đã lưu
                </>
              ) : (
                "Kho tài liệu"
              )}
            </h2>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-gray-200"
            >
              <Upload size={16} /> Tải lên
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-gray-400">Đang tải...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500">
                {viewMode === "saved"
                  ? "Bạn chưa lưu tài liệu nào."
                  : "Không tìm thấy tài liệu."}
              </p>
            </div>
          ) : (
            <>
              {/* Grid Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                {currentDocs.map((doc) => {
                  // 👇 THAY ĐỔI 3: Logic Quyền (Admin hoặc Chủ sở hữu)
                  const isAdmin = currentUser?.role === "admin";
                  const isOwner =
                    currentUser &&
                    (doc.uploaderUsername === currentUser.username ||
                      doc.uploader === currentUser.fullName); // Support dữ liệu cũ
                  const canAction = isAdmin || isOwner; // Cho phép sửa/xóa

                  const isSaved = currentUser?.savedDocs?.includes(doc.id);
                  const subjectName =
                    SUBJECTS.find((s) => s.id == doc.course)?.name || "Khác";

                  return (
                    <div
                      key={doc.id}
                      className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group flex flex-col h-full relative"
                    >
                      {/* HEADER: Icon và Title + Badge (Đã sửa lỗi đè chữ) */}
                      <div className="flex items-start gap-4 mb-4">
                        {/* Icon File */}
                        <FileThumbnail
                          type={doc.type || doc.path.split(".").pop()}
                          size="md"
                        />

                        {/* Content Right */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            {/* Tên file (Có thể xuống dòng) */}
                            <h4
                              className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight"
                              title={doc.name}
                            >
                              {doc.name}
                            </h4>

                            {/* Badge (Không dùng absolute nữa, dùng flex item để chiếm chỗ) */}
                            {doc.visibility === "private" ? (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 whitespace-nowrap">
                                <Lock size={10} /> Riêng tư
                              </span>
                            ) : (
                              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 whitespace-nowrap">
                                <Globe size={10} /> Công khai
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* INFO: Người tải, Môn, Ngày... (Giữ nguyên) */}
                      <div className="space-y-2 text-xs text-gray-500 mb-6 flex-1">
                        <div className="flex justify-between">
                          <span>Người tải:</span>
                          <span className="font-medium text-gray-700 truncate ml-2">
                            {doc.uploader || "Ẩn danh"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Môn:</span>
                          <span
                            className="font-medium text-gray-700 truncate max-w-[120px]"
                            title={subjectName}
                          >
                            {subjectName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ngày:</span>
                          <span className="font-medium text-gray-700">
                            {new Date(doc.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Kích cỡ:</span>
                          <span className="font-medium text-gray-700">
                            {(doc.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS FOOTER (Giữ nguyên) */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleView(doc)}
                          className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Xem"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleSave(doc.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isSaved
                              ? "text-blue-600 bg-blue-50"
                              : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          }`}
                          title="Lưu"
                        >
                          <Bookmark
                            size={18}
                            fill={isSaved ? "currentColor" : "none"}
                          />
                        </button>

                        {canAction && (
                          <>
                            <button
                              onClick={() => {
                                setDocToEdit(doc);
                                setEditModalOpen(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Sửa"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={20} className="text-gray-600" />
                  </button>
                  <span className="text-sm font-bold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={20} className="text-gray-600" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUpload}
        currentUser={currentUser}
      />
      <EditDocModal
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleEdit}
        doc={docToEdit}
      />
    </div>
  );
};

export default Documents;
