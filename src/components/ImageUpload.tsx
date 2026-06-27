import React, { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../lib/firebase";
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react";

interface ImageUploadProps {
  landlordUid: string;
  propertyId: string;
  uploadedUrls: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

interface UploadProgress {
  name: string;
  progress: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  landlordUid,
  propertyId,
  uploadedUrls,
  onChange,
  maxImages = 6,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadsInProgress, setUploadsInProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    setError(null);
    const validFiles: File[] = [];

    const slotsAvailable = maxImages - uploadedUrls.length - uploadsInProgress.length;
    if (slotsAvailable <= 0) {
      setError(`You can only upload up to ${maxImages} images.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, slotsAvailable);

    for (const file of filesToUpload) {
      // Validate type
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        continue;
      }
      // Validate size (< 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(`Image ${file.name} exceeds the 5MB size limit.`);
        continue;
      }
      validFiles.push(file);
    }

    // Start uploads
    for (const file of validFiles) {
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `property-images/${landlordUid}/${propertyId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Add to uploads progress
      setUploadsInProgress((prev) => [...prev, { name: file.name, progress: 0 }]);

      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadsInProgress((prev) =>
            prev.map((up) => (up.name === file.name ? { ...up, progress } : up))
          );
        },
        (err) => {
          console.error("Upload error:", err);
          setError(`Failed to upload ${file.name}: ${err.message}`);
          setUploadsInProgress((prev) => prev.filter((up) => up.name !== file.name));
        },
        async () => {
          // Success
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          onChange([...uploadedUrls, downloadUrl]);
          setUploadsInProgress((prev) => prev.filter((up) => up.name !== file.name));
        }
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveImage = async (urlToRemove: string) => {
    try {
      // Find Storage path from download URL if possible, otherwise just update the array
      // E.g., property-images%2F...
      const decodedUrl = decodeURIComponent(urlToRemove);
      const matches = decodedUrl.match(/o\/(property-images\/[^?]+)/);
      if (matches && matches[1]) {
        const storageRef = ref(storage, matches[1]);
        await deleteObject(storageRef);
      }
    } catch (err) {
      console.warn("Could not delete from storage, removing from UI anyway:", err);
    }
    onChange(uploadedUrls.filter((url) => url !== urlToRemove));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4" id="image-upload-container">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of uploaded images and ongoing uploads */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {uploadedUrls.map((url, idx) => (
          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-stone-200 group bg-stone-100" id={`uploaded-img-${idx}`}>
            <img
              src={url}
              alt={`Upload ${idx + 1}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => handleRemoveImage(url)}
              className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
              id={`remove-img-btn-${idx}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}

        {/* Upload in progress tiles */}
        {uploadsInProgress.map((up, idx) => (
          <div key={idx} className="aspect-video rounded-xl border border-theme-line bg-theme-bg flex flex-col items-center justify-center p-3 text-center space-y-2">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="absolute w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="text-stone-200"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  className="text-secondary transition-all duration-300"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - up.progress / 100)}
                />
              </svg>
              <span className="text-xs font-semibold text-stone-700">{up.progress}%</span>
            </div>
            <span className="text-[10px] text-stone-500 truncate max-w-full font-mono">{up.name}</span>
          </div>
        ))}

        {/* Upload Trigger Area */}
        {uploadedUrls.length + uploadsInProgress.length < maxImages && (
          <button
            type="button"
            onClick={triggerFileInput}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-secondary bg-accent-light/40"
                : "border-theme-line hover:border-secondary bg-theme-bg hover:bg-theme-bg/50"
            }`}
            id="drag-drop-zone-btn"
          >
            <Upload className={`h-6 w-6 mb-2 ${isDragging ? "text-secondary" : "text-stone-400"}`} />
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">Upload photos</span>
            <span className="text-[10px] text-stone-400 mt-1 font-medium">Drag & drop or click ({uploadedUrls.length}/{maxImages})</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </button>
        )}
      </div>
    </div>
  );
};
