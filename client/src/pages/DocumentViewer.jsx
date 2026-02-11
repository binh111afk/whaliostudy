import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Calendar,
  User,
  FileText,
  Eye,
  Share2,
  Bookmark,
  Check,
  Upload,
  Heart,
  X,
  Copy,
  Facebook,
  Twitter,
  Mail,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";
import { documentService } from "../services/documentService";
import { UploadModal } from "../components/DocumentModals";

const ZaloIcon = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 122.88 116.57"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ enableBackground: "new 0 0 122.88 116.57" }}
    xmlSpace="preserve"
  >
    <g>
      {/* Path 1: st1 color */}
      <path
        fill="#0180C7"
        d="M38.66,113.29c-6.87,0-13.76,0.23-20.63-0.03C9.91,112.94,3.7,106.13,3.7,98c0-26.24,0.05-52.47,0-78.73 c0-8.98,7.02-15.24,15.09-15.47c8.45-0.23,16.93-0.05,25.41-0.05c0.15,0,0.35-0.08,0.43,0.18c-0.05,0.45-0.5,0.5-0.78,0.68 c-4.98,2.92-9.53,6.41-13.36,10.74c-6.31,7.14-10.69,15.34-12.17,24.88c-2.62,16.83,2.64,31.12,14.54,43.04 c2.11,2.14,2.39,3.8,0.7,6.67c-2.04,3.45-5.13,5.79-8.43,7.92c-0.35,0.2-0.7,0.45-1.06,0.68c-0.53,0.45-0.2,0.68,0.25,0.88 c0.1,0.23,0.23,0.43,0.38,0.63c2.89,2.57,5.63,5.31,8.48,7.92c1.33,1.23,2.67,2.51,3.95,3.8 C37.66,112.24,38.54,112.39,38.66,113.29L38.66,113.29L38.66,113.29z"
      />
      {/* Path 2: st0 color */}
      <path
        fill="#0172B1"
        d="M38.66,113.29c-0.13-0.88-1.01-1.03-1.53-1.56c-1.28-1.31-2.62-2.57-3.95-3.8c-2.84-2.62-5.58-5.36-8.48-7.92 c-0.15-0.2-0.28-0.4-0.38-0.63c6.41,1.26,12.68,0.4,18.84-1.48c2.09-0.63,4.18-1.26,6.29-1.79c1.43-0.38,2.94-0.3,4.33,0.2 c15.95,5.48,31.69,4.98,47.19-1.81c6.31-2.79,12.07-6.72,16.95-11.62c0.25-0.25,0.43-0.63,0.88-0.65c0.23,0.35,0.1,0.73,0.1,1.11 v14.71c0.05,8.4-6.69,15.24-15.09,15.32h-0.13c-9.05,0.05-18.11,0-27.17,0H40.17C39.67,113.32,39.17,113.29,38.66,113.29 L38.66,113.29L38.66,113.29z"
      />
      {/* Path 3: st1 color */}
      <path
        fill="#0180C7"
        d="M42.59,57c3.8,0,7.37-0.02,10.92,0c1.99,0.03,3.07,0.86,3.27,2.44c0.23,1.99-0.93,3.32-3.09,3.35 c-4.08,0.05-8.13,0.03-12.2,0.03c-1.18,0-2.34,0.05-3.52-0.03c-1.46-0.08-2.89-0.38-3.6-1.89c-0.7-1.51-0.2-2.87,0.75-4.1 c3.87-4.93,7.77-9.89,11.67-14.82c0.23-0.3,0.45-0.6,0.68-0.88c-0.25-0.43-0.6-0.23-0.91-0.25c-2.72-0.03-5.46,0-8.18-0.03 c-0.63,0-1.26-0.08-1.86-0.2c-1.43-0.33-2.31-1.76-1.99-3.17c0.23-0.96,0.98-1.74,1.94-1.96c0.6-0.15,1.23-0.23,1.86-0.23 c4.48-0.02,8.98-0.02,13.46,0c0.8-0.02,1.58,0.08,2.36,0.28c1.71,0.58,2.44,2.16,1.76,3.82c-0.6,1.43-1.56,2.67-2.52,3.9 c-3.3,4.2-6.59,8.38-9.89,12.53C43.24,56.12,42.99,56.45,42.59,57L42.59,57L42.59,57z"
      />
      {/* Path 4: st1 color */}
      <path
        fill="#0180C7"
        d="M71.77,43.77c0.6-0.78,1.23-1.51,2.26-1.71c1.99-0.4,3.85,0.88,3.87,2.89c0.08,5.03,0.05,10.06,0,15.09 c0,1.31-0.85,2.46-2.09,2.84c-1.26,0.48-2.69,0.1-3.52-0.98c-0.43-0.53-0.6-0.63-1.21-0.15c-2.29,1.86-4.88,2.19-7.67,1.28 c-4.48-1.46-6.31-4.96-6.82-9.21c-0.53-4.6,1.01-8.53,5.13-10.94C65.15,40.85,68.62,41.03,71.77,43.77L71.77,43.77L71.77,43.77z M62.86,52.95c0.05,1.11,0.4,2.16,1.06,3.04c1.36,1.81,3.95,2.19,5.79,0.83c0.3-0.23,0.58-0.5,0.83-0.83 c1.41-1.91,1.41-5.06,0-6.97c-0.71-0.98-1.81-1.56-2.99-1.58C64.77,47.27,62.84,49.4,62.86,52.95L62.86,52.95L62.86,52.95z M89.2,53.1c-0.2-6.46,4.05-11.29,10.09-11.47c6.41-0.2,11.09,4.1,11.29,10.39c0.2,6.36-3.7,10.87-9.71,11.47 C94.3,64.14,89.1,59.39,89.2,53.1L89.2,53.1L89.2,53.1z M95.51,52.5c-0.05,1.26,0.33,2.49,1.08,3.52c1.38,1.81,3.97,2.16,5.79,0.75 c0.28-0.2,0.5-0.45,0.73-0.7c1.46-1.91,1.46-5.13,0.03-7.04c-0.71-0.96-1.81-1.56-2.99-1.58C97.42,47.29,95.51,49.35,95.51,52.5 L95.51,52.5L95.51,52.5z M86.98,48.1c0,3.9,0.03,7.8,0,11.7c0.03,1.79-1.38,3.27-3.17,3.32c-0.3,0-0.63-0.03-0.93-0.1 c-1.26-0.33-2.21-1.66-2.21-3.25v-20c0-1.18-0.03-2.34,0-3.52c0.03-1.94,1.26-3.19,3.12-3.19c1.91-0.02,3.19,1.23,3.19,3.24 C87.01,40.22,86.98,44.17,86.98,48.1L86.98,48.1L86.98,48.1z"
      />
      {/* Path 5: st1 color */}
      <path
        fill="#0180C7"
        d="M20.18,0h82.53c5.57,0,10.61,2.26,14.27,5.91c3.65,3.65,5.91,8.7,5.91,14.27v76.22 c0,5.57-2.26,10.62-5.91,14.27c-3.65,3.65-8.7,5.91-14.27,5.91H20.18c-5.57,0-10.61-2.26-14.27-5.91C2.26,107.01,0,101.96,0,96.39 V20.17C0,14.6,2.26,9.56,5.91,5.91C9.56,2.26,14.6,0,20.18,0L20.18,0z M102.71,7.65H20.18c-3.46,0-6.59,1.4-8.86,3.67 c-2.27,2.27-3.67,5.4-3.67,8.86v76.22c0,3.46,1.4,6.59,3.67,8.86c2.27,2.27,5.4,3.67,8.86,3.67h82.53c3.46,0,6.59-1.4,8.86-3.67 c2.27-2.27,3.67-5.4,3.67-8.86V20.17c0-3.46-1.4-6.59-3.67-8.86C109.29,9.05,106.16,7.65,102.71,7.65L102.71,7.65z"
      />
    </g>
  </svg>
);

// --- COMPONENT ICON FILE SVG (Đã fix logic Gom Nhóm) ---
const FileThumbnail = ({ type, size = "md" }) => {
    // 1. Chuẩn hóa đầu vào (về chữ thường)
    const ext = (type || "other").toLowerCase();
    
    // 2. Logic Gom Nhóm (Mapping thông minh)
    let iconType = "other";
  
    // Nhóm WORD: Bao gồm đuôi .doc, .docx và loại 'word' từ DB
    if (["doc", "docx", "word", "msword"].includes(ext)) {
      iconType = "word";
    } 
    // Nhóm EXCEL: Bao gồm .xls, .xlsx, .csv và loại 'excel', 'spreadsheet'
    else if (["xls", "xlsx", "csv", "excel", "spreadsheet"].includes(ext)) {
      iconType = "excel";
    }
    // Nhóm POWERPOINT: Bao gồm .ppt, .pptx và loại 'powerpoint', 'presentation', 'slide'
    else if (["ppt", "pptx", "powerpoint", "presentation", "slide"].includes(ext)) {
      iconType = "ppt";
    }
    // Nhóm PDF
    else if (["pdf"].includes(ext)) {
      iconType = "pdf";
    }
    // Nhóm TEXT
    else if (["txt", "rtf", "text"].includes(ext)) {
      iconType = "txt";
    }
    // Nhóm NÉN (ZIP): Bao gồm .zip, .rar, .7z...
    else if (["zip", "rar", "7z", "tar", "gz", "archive"].includes(ext)) {
      iconType = "zip";
    }
    // Nhóm ẢNH (JPG): Dành riêng cho Jpg/Jpeg
    else if (["jpg", "jpeg"].includes(ext)) {
      iconType = "jpg";
    }
    // Nhóm ẢNH CHUNG (PNG): Dùng cho Png, Gif, Webp và loại 'image' chung chung
    else if (["png", "webp", "gif", "svg", "image"].includes(ext)) {
      iconType = "png"; 
    }
  
    // 3. Kích thước (px)
    const dim = size === "lg" ? 64 : 40;
  
    // 4. Bộ sưu tập SVG
    const icons = {
      pdf: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#F15642"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M101.744,303.152c0-4.224,3.328-8.832,8.688-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.688-3.184-8.688-8.816V303.152z M118.624,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504c0-8.944-6.784-16.368-15.36-16.368H118.624z" />
            <path style={{fill:"#FFFFFF"}} d="M196.656,384c-4.224,0-8.832-2.304-8.832-7.92v-72.672c0-4.592,4.608-7.936,8.832-7.936h29.296 c58.464,0,57.184,88.528,1.152,88.528H196.656z M204.72,311.088V368.4h21.232c34.544,0,36.08-57.312,0-57.312H204.72z" />
            <path style={{fill:"#FFFFFF"}} d="M303.872,312.112v20.336h32.624c4.608,0,9.216,4.608,9.216,9.072c0,4.224-4.608,7.68-9.216,7.68 h-32.624v26.864c0,4.48-3.184,7.92-7.664,7.92c-5.632,0-9.072-3.44-9.072-7.92v-72.672c0-4.592,3.456-7.936,9.072-7.936h44.912 c5.632,0,8.96,3.344,8.96,7.936c0,4.096-3.328,8.704-8.96,8.704h-37.248V312.112z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      word: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#50BEE8"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M92.576,384c-4.224,0-8.832-2.32-8.832-7.936v-72.656c0-4.608,4.608-7.936,8.832-7.936h29.296 c58.464,0,57.168,88.528,1.136,88.528H92.576z M100.64,311.072v57.312h21.232c34.544,0,36.064-57.312,0-57.312H100.64z" />
            <path style={{fill:"#FFFFFF"}} d="M228,385.28c-23.664,1.024-48.24-14.72-48.24-46.064c0-31.472,24.56-46.944,48.24-46.944 c22.384,1.136,45.792,16.624,45.792,46.944C273.792,369.552,250.384,385.28,228,385.28z M226.592,308.912 c-14.336,0-29.936,10.112-29.936,30.32c0,20.096,15.616,30.336,29.936,30.336c14.72,0,30.448-10.24,30.448-30.336 C257.04,319.008,241.312,308.912,226.592,308.912z" />
            <path style={{fill:"#FFFFFF"}} d="M288.848,339.088c0-24.688,15.488-45.92,44.912-45.92c11.136,0,19.968,3.328,29.296,11.392 c3.456,3.184,3.84,8.816,0.384,12.4c-3.456,3.056-8.704,2.688-11.776-0.384c-5.232-5.504-10.608-7.024-17.904-7.024 c-19.696,0-29.152,13.952-29.152,29.552c0,15.872,9.328,30.448,29.152,30.448c7.296,0,14.08-2.96,19.968-8.192 c3.952-3.072,9.456-1.552,11.76,1.536c2.048,2.816,3.056,7.552-1.408,12.016c-8.96,8.336-19.696,10-30.336,10 C302.8,384.912,288.848,363.776,288.848,339.088z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      excel: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#84BD5A"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M144.336,326.192l22.256-27.888c6.656-8.704,19.584,2.416,12.288,10.736 c-7.664,9.088-15.728,18.944-23.408,29.04l26.096,32.496c7.04,9.6-7.024,18.8-13.936,9.328l-23.552-30.192l-23.152,30.848 c-6.528,9.328-20.992-1.152-13.696-9.856l25.712-32.624c-8.064-10.112-15.872-19.952-23.664-29.04 c-8.048-9.6,6.912-19.44,12.8-10.464L144.336,326.192z" />
            <path style={{fill:"#FFFFFF"}} d="M197.36,303.152c0-4.224,3.584-7.808,8.064-7.808c4.096,0,7.552,3.6,7.552,7.808v64.096h34.8 c12.528,0,12.8,16.752,0,16.752H205.44c-4.48,0-8.064-3.184-8.064-7.792v-73.056H197.36z" />
            <path style={{fill:"#FFFFFF"}} d="M272.032,314.672c2.944-24.832,40.416-29.296,58.08-15.728c8.704,7.024-0.512,18.16-8.192,12.528 c-9.472-6-30.96-8.816-33.648,4.464c-3.456,20.992,52.192,8.976,51.296,43.008c-0.896,32.496-47.968,33.248-65.632,18.672 c-4.24-3.456-4.096-9.072-1.792-12.544c3.328-3.312,7.024-4.464,11.392-0.88c10.48,7.152,37.488,12.528,39.392-5.648 C321.28,339.632,268.064,351.008,272.032,314.672z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      ppt: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#F15642"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M105.456,303.152c0-4.224,3.328-8.832,8.688-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.568,8.816-8.176,8.816c-4.224,0-8.688-3.184-8.688-8.816v-72.032 H105.456z M122.336,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504c0-8.944-6.784-16.368-15.36-16.368H122.336z" />
            <path style={{fill:"#FFFFFF"}} d="M191.616,303.152c0-4.224,3.328-8.832,8.704-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.704-3.184-8.704-8.816V303.152z M208.496,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504c0-8.944-6.784-16.368-15.36-16.368H208.496z" />
            <path style={{fill:"#FFFFFF"}} d="M301.68,311.472h-22.368c-11.136,0-11.136-16.368,0-16.368h60.496c11.392,0,11.392,16.368,0,16.368 h-21.232v64.608c0,11.12-16.896,11.392-16.896,0V311.472z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      txt: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#576D7E"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M132.784,311.472H110.4c-11.136,0-11.136-16.368,0-16.368h60.512c11.392,0,11.392,16.368,0,16.368 h-21.248v64.592c0,11.12-16.896,11.392-16.896,0v-64.592H132.784z" />
            <path style={{fill:"#FFFFFF"}} d="M224.416,326.176l22.272-27.888c6.656-8.688,19.568,2.432,12.288,10.752 c-7.68,9.088-15.728,18.944-23.424,29.024l26.112,32.496c7.024,9.6-7.04,18.816-13.952,9.344l-23.536-30.192l-23.152,30.832 c-6.528,9.328-20.992-1.152-13.68-9.856l25.696-32.624c-8.048-10.096-15.856-19.936-23.664-29.024 c-8.064-9.6,6.912-19.44,12.784-10.48L224.416,326.176z" />
            <path style={{fill:"#FFFFFF"}} d="M298.288,311.472H275.92c-11.136,0-11.136-16.368,0-16.368h60.496c11.392,0,11.392,16.368,0,16.368 h-21.232v64.592c0,11.12-16.896,11.392-16.896,0V311.472z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      zip: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#84BD5A"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M132.64,384c-8.064,0-11.264-7.792-6.656-13.296l45.552-60.512h-37.76 c-11.12,0-10.224-15.712,0-15.712h51.568c9.712,0,12.528,9.184,5.632,16.624l-43.632,56.656h41.584 c10.24,0,11.52,16.256-1.008,16.256h-55.28V384z" />
            <path style={{fill:"#FFFFFF"}} d="M212.048,303.152c0-10.496,16.896-10.88,16.896,0v73.04c0,10.608-16.896,10.88-16.896,0V303.152z" />
            <path style={{fill:"#FFFFFF"}} d="M251.616,303.152c0-4.224,3.328-8.832,8.704-8.832h29.552c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.704-3.184-8.704-8.816 L251.616,303.152L251.616,303.152z M268.496,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504 c0-8.944-6.784-16.368-15.36-16.368H268.496z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      png: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#A066AA"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M92.816,303.152c0-4.224,3.312-8.848,8.688-8.848h29.568c16.624,0,31.6,11.136,31.6,32.496 c0,20.224-14.976,31.472-31.6,31.472H109.68v16.896c0,5.648-3.552,8.832-8.176,8.832c-4.224,0-8.688-3.184-8.688-8.832 C92.816,375.168,92.816,303.152,92.816,303.152z M109.68,310.432v31.856h21.376c8.56,0,15.344-7.552,15.344-15.488 c0-8.96-6.784-16.368-15.344-16.368L109.68,310.432L109.68,310.432z" />
            <path style={{fill:"#FFFFFF"}} d="M178.976,304.432c0-4.624,1.024-9.088,7.68-9.088c4.592,0,5.632,1.152,9.072,4.464l42.336,52.976 v-49.632c0-4.224,3.696-8.848,8.064-8.848c4.608,0,9.072,4.624,9.072,8.848v72.016c0,5.648-3.456,7.792-6.784,8.832 c-4.464,0-6.656-1.024-10.352-4.464l-42.336-53.744v49.392c0,5.648-3.456,8.832-8.064,8.832s-8.704-3.184-8.704-8.832v-70.752 H178.976z" />
            <path style={{fill:"#FFFFFF"}} d="M351.44,374.16c-9.088,7.536-20.224,10.752-31.472,10.752c-26.88,0-45.936-15.36-45.936-45.808 c0-25.84,20.096-45.92,47.072-45.92c10.112,0,21.232,3.456,29.168,11.264c7.808,7.664-3.456,19.056-11.12,12.288 c-4.736-4.624-11.392-8.064-18.048-8.064c-15.472,0-30.432,12.4-30.432,30.432c0,18.944,12.528,30.448,29.296,30.448 c7.792,0,14.448-2.304,19.184-5.76V348.08h-19.184c-11.392,0-10.24-15.632,0-15.632h25.584c4.736,0,9.072,3.6,9.072,7.568v27.248 C354.624,369.552,353.616,371.712,351.44,374.16z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      ),
      jpg: (
        <svg width={dim} height={dim} viewBox="0 0 512 512" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path style={{fill:"#E2E5E7"}} d="M128,0c-17.6,0-32,14.4-32,32v448c0,17.6,14.4,32,32,32h320c17.6,0,32-14.4,32-32V128L352,0H128z" />
          <path style={{fill:"#B0B7BD"}} d="M384,128h96L352,0v96C352,113.6,366.4,128,384,128z" />
          <polygon style={{fill:"#CAD1D8"}} points="480,224 384,128 480,128 " />
          <path style={{fill:"#50BEE8"}} d="M416,416c0,8.8-7.2,16-16,16H48c-8.8,0-16-7.2-16-16V256c0-8.8,7.2-16,16-16h352c8.8,0,16,7.2,16,16 V416z" />
          <g>
            <path style={{fill:"#FFFFFF"}} d="M141.968,303.152c0-10.752,16.896-10.752,16.896,0v50.528c0,20.096-9.6,32.256-31.728,32.256 c-10.88,0-19.952-2.96-27.888-13.184c-6.528-7.808,5.76-19.056,12.416-10.88c5.376,6.656,11.136,8.192,16.752,7.936 c7.152-0.256,13.44-3.472,13.568-16.128v-50.528H141.968z" />
            <path style={{fill:"#FFFFFF"}} d="M181.344,303.152c0-4.224,3.328-8.832,8.704-8.832H219.6c16.64,0,31.616,11.136,31.616,32.48 c0,20.224-14.976,31.488-31.616,31.488h-21.36v16.896c0,5.632-3.584,8.816-8.192,8.816c-4.224,0-8.704-3.184-8.704-8.816 L181.344,303.152L181.344,303.152z M198.24,310.432v31.872h21.36c8.576,0,15.36-7.568,15.36-15.504 c0-8.944-6.784-16.368-15.36-16.368H198.24z" />
            <path style={{fill:"#FFFFFF"}} d="M342.576,374.16c-9.088,7.552-20.224,10.752-31.472,10.752c-26.88,0-45.936-15.344-45.936-45.808 c0-25.824,20.096-45.904,47.072-45.904c10.112,0,21.232,3.44,29.168,11.248c7.792,7.664-3.456,19.056-11.12,12.288 c-4.736-4.608-11.392-8.064-18.048-8.064c-15.472,0-30.432,12.4-30.432,30.432c0,18.944,12.528,30.464,29.296,30.464 c7.792,0,14.448-2.32,19.184-5.76V348.08h-19.184c-11.392,0-10.24-15.616,0-15.616h25.584c4.736,0,9.072,3.584,9.072,7.552v27.248 C345.76,369.568,344.752,371.712,342.576,374.16z" />
          </g>
          <path style={{fill:"#CAD1D8"}} d="M400,432H96v16h304c8.8,0,16-7.2,16-16v-16C416,424.8,408.8,432,400,432z" />
        </svg>
      )
    };
  
    // 5. Nếu không tìm thấy loại file, dùng icon mặc định
    return (
      <div className="shrink-0 flex items-center justify-center transition-transform hover:scale-105">
        {icons[iconType] || <FileText size={dim} className="text-gray-400" />}
      </div>
    );
  };

// --- COMPONENT CON: SHARE MODAL (Giao diện giống YouTube) ---
const ShareModal = ({ isOpen, onClose, url, title }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Hàm tạo link chia sẻ MXH
  const socialLinks = [
    {
      name: "Zalo",
      icon: <ZaloIcon size={32} />,
      bg: "bg-blue-50", // Nền xanh nhạt
      href: `https://zalo.me/share/?url=${encodeURIComponent(
        url
      )}&title=${encodeURIComponent(title)}`,
    },
    {
      name: "Facebook",
      icon: <Facebook size={24} className="text-blue-600" />,
      bg: "bg-blue-50",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
    },
    {
      name: "Twitter",
      icon: <Twitter size={24} className="text-sky-500" />,
      bg: "bg-sky-50",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(title)}`,
    },
    {
      name: "Email",
      icon: <Mail size={24} className="text-gray-600" />,
      bg: "bg-gray-100",
      href: `mailto:?subject=${encodeURIComponent(
        title
      )}&body=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Share2 size={20} /> Chia sẻ tài liệu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Social Icons Row */}
        <div className="flex justify-around gap-2 mb-8">
          {socialLinks.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-14 h-14 rounded-full ${social.bg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm border border-transparent group-hover:border-gray-200`}
              >
                {social.icon}
              </div>
              <span className="text-xs font-medium text-gray-500">
                {social.name}
              </span>
            </a>
          ))}
        </div>

        {/* Copy Link Section (Giống YouTube) */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center gap-2">
          <div className="flex-1 bg-transparent px-3 py-1 text-sm text-gray-600 truncate font-mono select-all">
            {url}
          </div>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
              isCopied
                ? "bg-green-500 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isCopied ? <Check size={16} /> : <Copy size={16} />}
            {isCopied ? "Đã copy" : "Sao chép"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH ---
const DocumentViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State dữ liệu
  const [document, setDocument] = useState(null);
  const [relatedDocs, setRelatedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // State User & Tương tác
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user"))
  );
  const [isSaved, setIsSaved] = useState(false);

  // State Modals
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);

  // --- 1. LOAD DỮ LIỆU & TĂNG LƯỢT XEM ---
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        // Gọi API tăng lượt xem trước, chờ hoàn tất
        await fetch(`/api/documents/view/${id}`, { method: 'POST' }).catch(() => {});

        // Sau đó mới lấy dữ liệu (đã có viewCount mới)
        const res = await fetch("/api/documents");
        const allDocs = await res.json();

        const currentDoc = allDocs.find((d) => d.id === id || d._id === id);

        if (currentDoc) {
          setDocument(currentDoc);
          if (currentUser && currentUser.savedDocs) {
            setIsSaved(
              currentUser.savedDocs.includes(currentDoc.id || currentDoc._id)
            );
          }

          // Lọc tài liệu cùng môn
          const related = allDocs
            .filter(
              (d) =>
                d.course === currentDoc.course && d.id !== id && d._id !== id
            )
            .slice(0, 5);

          setRelatedDocs(related);
        }
      } catch (error) {
        console.error("Lỗi tải tài liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, currentUser?.username]);

  // --- XỬ LÝ LƯU ---
  const handleToggleSave = async () => {
    if (!currentUser) return alert("Vui lòng đăng nhập!");
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    try {
      await fetch("/api/toggle-save-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: currentUser.username,
          docId: document.id || document._id,
        }),
      });
      const updatedUser = { ...currentUser };
      if (newSavedState) updatedUser.savedDocs.push(document.id);
      else
        updatedUser.savedDocs = updatedUser.savedDocs.filter(
          (d) => d !== document.id
        );
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } catch (error) {
      setIsSaved(!newSavedState);
    }
  };

  // --- XỬ LÝ TẢI XUỐNG (Force Download) ---
  const handleDownload = async () => {
    if (!document || !document.path) return;
    setIsDownloading(true);

    try {
      // Cách 1: Thử dùng fetch Blob để ép trình duyệt tải về
      const response = await fetch(document.path);
      if (!response.ok) throw new Error("Network response was not ok");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      // Đặt tên file khi tải về
      a.download = document.name || "tai-lieu-whalio";
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.warn(
        "Fetch download failed, falling back to Cloudinary attachment mode...",
        error
      );

      // Cách 2 (Fallback): Nếu file từ Cloudinary, thêm flag attachment
      // URL Cloudinary thường dạng: .../upload/v12345/folder/file.pdf
      // Ta chèn /fl_attachment/ vào sau /upload/
      let downloadUrl = document.path;
      if (downloadUrl.includes("/upload/")) {
        downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
      }
      window.open(downloadUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // Hàm xử lý upload thành công
  const handleUploadSuccess = async (formData) => {
    const res = await documentService.uploadDocument(formData);
    if (res.success) {
      alert("Tải lên thành công! Cảm ơn đóng góp của ông.");
      setUploadModalOpen(false);
    } else {
      alert("Lỗi: " + res.message);
    }
  };

  // --- RENDER VIEWER ---
  const renderViewer = (doc) => {
    const ext = doc.path.split(".").pop().toLowerCase();

    // PDF
    if (ext === "pdf") {
      return (
        <iframe
          src={doc.path}
          className="w-full h-[800px] rounded-xl border border-gray-200"
          title="PDF Viewer"
        />
      );
    }

    // Office (Word/Excel/PPT) - Dùng MS Viewer
    if (["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(ext)) {
      // Encode URL cẩn thận
      const encodedUrl = encodeURIComponent(doc.path);
      const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
      return (
        <iframe
          src={officeUrl}
          className="w-full h-[800px] rounded-xl border border-gray-200"
          title="Office Viewer"
        />
      );
    }

    // Ảnh
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return (
        <img
          src={doc.path}
          alt={doc.name}
          className="w-full h-auto rounded-xl object-contain bg-gray-50 border border-gray-200"
        />
      );
    }

    // Fallback
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <FileText size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-500 font-medium">
          Định dạng file này không hỗ trợ xem trước.
        </p>
        <button
          onClick={handleDownload}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
        >
          Tải xuống để xem
        </button>
      </div>
    );
  };

  if (loading)
    return (
      <div className="p-10 text-center animate-pulse">Đang tải tài liệu...</div>
    );
  if (!document)
    return (
      <div className="p-10 text-center text-red-500">
        Không tìm thấy tài liệu!
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 min-h-screen pb-20">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-bold transition-colors w-fit"
        >
          <ArrowLeft size={20} /> Quay lại
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleToggleSave}
            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border ${
              isSaved
                ? "bg-blue-50 text-blue-600 border-blue-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />{" "}
            {isSaved ? "Đã lưu" : "Lưu"}
          </button>

          {/* Nút CHIA SẺ -> Mở Modal */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Share2 size={18} /> Chia sẻ
          </button>

          {/* Nút TẢI XUỐNG -> Gọi hàm Download xịn */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black shadow-lg shadow-gray-200 transition-all disabled:opacity-70 cursor-pointer"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download size={18} />
            )}
            {isDownloading ? "Đang tải..." : "Tải xuống"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CỘT TRÁI: Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
              {/* 👇 THAY ĐOẠN NÀY: Dùng FileThumbnail thay cho FileText cũ */}
              <FileThumbnail
                type={document.type || document.path.split(".").pop()}
                size="lg"
              />

              <div>
                <h1 className="text-xl font-bold text-gray-800 leading-snug mb-2">
                  {document.name}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <User size={14} /> {document.uploader}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {document.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} /> {document.viewCount || 0} lượt xem
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white p-1 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {renderViewer(document)}
          </div>
        </div>

        {/* CỘT PHẢI: Gợi ý & Đóng góp */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 sticky top-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Bookmark className="text-yellow-500" size={18} /> Tài liệu cùng
              môn
            </h3>

            {relatedDocs.length > 0 ? (
              <div className="space-y-3">
                {relatedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => navigate(`/documents/${doc.id || doc._id}`)}
                    className="group p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-all border border-transparent hover:border-gray-100 flex gap-3"
                  >
                    {/* 👇 THAY ĐOẠN ICON CŨ BẰNG COMPONENT NÀY */}
                    <FileThumbnail
                      type={doc.type || doc.path.split(".").pop()}
                      size="md"
                    />

                    <div className="min-w-0 flex flex-col justify-center">
                      <h4 className="text-sm font-semibold text-gray-700 line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>
                          {doc.size
                            ? (doc.size / 1024 / 1024).toFixed(1) + " MB"
                            : "UNK"}
                        </span>
                        <span>•</span>
                        <span>{doc.uploader}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Chưa có tài liệu liên quan.
              </p>
            )}

            {/* BOX ĐÓNG GÓP TÀI LIỆU */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-5 text-white text-center relative overflow-hidden shadow-lg shadow-blue-200">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/10 rounded-full -ml-6 -mb-6"></div>

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm">
                    <Heart className="text-white fill-white" size={20} />
                  </div>
                  <h4 className="font-bold text-lg mb-1">Đóng góp tài liệu?</h4>
                  <p className="text-xs text-blue-100 mb-4 px-2 leading-relaxed">
                    Giúp cộng đồng Whalio phong phú hơn bằng cách chia sẻ tài
                    liệu của ông nhé!
                  </p>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Upload size={16} /> Tải lên ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        currentUser={currentUser}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
        url={window.location.href}
        title={document.name}
      />
    </div>
  );
};

export default DocumentViewer;
