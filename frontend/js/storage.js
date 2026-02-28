// Supabase Storage Service for File Management
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

// Initialize Supabase client
const supabaseUrl = 'https://rmjjzoqjulvrbpfczxje.supabase.co'; // Replace YOUR_PROJECT_ID with your actual project ID
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtamp6b3FqdWx2cmJwZmN6eGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NzIwMjksImV4cCI6MjA3MzM0ODAyOX0.C6nHwWizlU30TzLrXnUQFDN4vXMZjwHN243xZCULu2w'; // Replace with your actual anon key from Supabase dashboard
const supabase = createClient(supabaseUrl, supabaseAnonKey);

class StorageService {
  constructor() {
    this.buckets = {
      AVATARS: 'avatars',
      CREATIONS: 'creations',
      REQUESTS: 'requests',
      MESSAGES: 'messages',
      TEMP: 'temp'
    };
    
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    this.allowedFileTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
  }

  // Upload a file to Supabase Storage
  async uploadFile(file, bucket, path = null, options = {}) {
    try {
      // Validate file
      const validation = this.validateFile(file, options);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename if not provided
      const fileName = path || this.generateFileName(file);
      const fullPath = `${this.getUserId()}/${fileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fullPath, file, {
          cacheControl: '3600',
          upsert: options.overwrite || false,
          ...options
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fullPath);

      return {
        success: true,
        path: fullPath,
        url: urlData.publicUrl,
        data: data
      };

    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload multiple files
  async uploadFiles(files, bucket, options = {}) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const result = await this.uploadFile(files[i], bucket, null, options);
      results.push({
        file: files[i].name,
        ...result
      });
    }

    return results;
  }

  // Upload image with automatic resizing
  async uploadImage(file, bucket, path = null, options = {}) {
    try {
      // Resize image if needed
      const resizedFile = await this.resizeImage(file, options.maxWidth, options.maxHeight);
      
      return await this.uploadFile(resizedFile, bucket, path, {
        ...options,
        contentType: 'image/jpeg'
      });
    } catch (error) {
      console.error('Image upload error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Upload avatar image
  async uploadAvatar(file, userId = null) {
    const targetUserId = userId || this.getUserId();
    const fileName = `avatar_${Date.now()}.jpg`;
    
    return await this.uploadImage(file, this.buckets.AVATARS, `${targetUserId}/${fileName}`, {
      maxWidth: 300,
      maxHeight: 300,
      quality: 0.8
    });
  }

  // Upload creation gallery image
  async uploadCreationImage(file, creationId, userId = null) {
    const targetUserId = userId || this.getUserId();
    const fileName = `creation_${creationId}_${Date.now()}.jpg`;
    
    return await this.uploadImage(file, this.buckets.CREATIONS, `${targetUserId}/${fileName}`, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.9
    });
  }

  // Upload request image
  async uploadRequestImage(file, requestId, userId = null) {
    const targetUserId = userId || this.getUserId();
    const fileName = `request_${requestId}_${Date.now()}.jpg`;
    
    return await this.uploadImage(file, this.buckets.REQUESTS, `${targetUserId}/${fileName}`, {
      maxWidth: 800,
      maxHeight: 600,
      quality: 0.8
    });
  }

  // Upload message attachment
  async uploadMessageAttachment(file, messageId, userId = null) {
    const targetUserId = userId || this.getUserId();
    const fileName = `msg_${messageId}_${Date.now()}.${this.getFileExtension(file.name)}`;
    
    return await this.uploadFile(file, this.buckets.MESSAGES, `${targetUserId}/${fileName}`);
  }

  // Delete a file
  async deleteFile(bucket, path) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete multiple files
  async deleteFiles(bucket, paths) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // List files in a bucket
  async listFiles(bucket, path = '', options = {}) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path, {
          limit: options.limit || 100,
          offset: options.offset || 0,
          sortBy: options.sortBy || { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      return {
        success: true,
        files: data
      };
    } catch (error) {
      console.error('List files error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get file info
  async getFileInfo(bucket, path) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(path.split('/').slice(0, -1).join('/'), {
          search: path.split('/').pop()
        });

      if (error) throw error;

      return {
        success: true,
        file: data[0] || null
      };
    } catch (error) {
      console.error('Get file info error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get public URL for a file
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Create signed URL for private file access
  async createSignedUrl(bucket, path, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) throw error;

      return {
        success: true,
        url: data.signedUrl
      };
    } catch (error) {
      console.error('Create signed URL error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate file before upload
  validateFile(file, options = {}) {
    // Check file size
    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size must be less than ${this.formatFileSize(this.maxFileSize)}`
      };
    }

    // Check file type
    const allowedTypes = options.imageOnly ? this.allowedImageTypes : this.allowedFileTypes;
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    return { valid: true };
  }

  // Resize image
  async resizeImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.9) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;

        // Draw and resize
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', quality);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Generate unique filename
  generateFileName(file) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = this.getFileExtension(file.name);
    return `${timestamp}_${random}.${extension}`;
  }

  // Get file extension
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get current user ID
  getUserId() {
    return window.authService?.getCurrentUser()?.id || 'anonymous';
  }

  // Create file upload widget
  createUploadWidget(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const widget = document.createElement('div');
    widget.className = 'file-upload-widget';
    widget.innerHTML = `
      <input type="file" id="fileInput" multiple accept="${options.accept || 'image/*'}" style="display: none;">
      <div class="upload-area" id="uploadArea">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Click to upload or drag and drop</div>
        <div class="upload-subtext">${options.maxSize ? `Max size: ${this.formatFileSize(options.maxSize)}` : ''}</div>
      </div>
      <div class="upload-progress" id="uploadProgress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">0%</div>
      </div>
      <div class="upload-files" id="uploadFiles"></div>
    `;

    container.appendChild(widget);
    this.setupUploadWidget(widget, options);
    return widget;
  }

  // Setup upload widget functionality
  setupUploadWidget(widget, options = {}) {
    const fileInput = widget.querySelector('#fileInput');
    const uploadArea = widget.querySelector('#uploadArea');
    const uploadProgress = widget.querySelector('#uploadProgress');
    const progressFill = widget.querySelector('#progressFill');
    const progressText = widget.querySelector('#progressText');
    const uploadFiles = widget.querySelector('#uploadFiles');

    // Click to upload
    uploadArea.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      this.handleFiles(e.dataTransfer.files, options, widget);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files, options, widget);
    });
  }

  // Handle file selection
  async handleFiles(files, options, widget) {
    const uploadFiles = widget.querySelector('#uploadFiles');
    const uploadProgress = widget.querySelector('#uploadProgress');
    const progressFill = widget.querySelector('#progressFill');
    const progressText = widget.querySelector('#progressText');

    // Show progress
    uploadProgress.style.display = 'block';
    uploadFiles.innerHTML = '';

    let completed = 0;
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Create file item
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <div class="file-name">${file.name}</div>
        <div class="file-status">Uploading...</div>
        <div class="file-progress">
          <div class="file-progress-bar">
            <div class="file-progress-fill"></div>
          </div>
        </div>
      `;
      uploadFiles.appendChild(fileItem);

      // Upload file
      const result = await this.uploadFile(file, options.bucket, null, options);
      
      // Update file item
      const fileStatus = fileItem.querySelector('.file-status');
      const fileProgressFill = fileItem.querySelector('.file-progress-fill');
      
      if (result.success) {
        fileStatus.textContent = 'Uploaded';
        fileStatus.className = 'file-status success';
        fileProgressFill.style.width = '100%';
      } else {
        fileStatus.textContent = result.error;
        fileStatus.className = 'file-status error';
      }

      // Update overall progress
      completed++;
      const progress = (completed / total) * 100;
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;

      // Callback
      if (options.onFileUpload) {
        options.onFileUpload(result, file);
      }
    }

    // Hide progress when done
    setTimeout(() => {
      uploadProgress.style.display = 'none';
    }, 1000);

    // Callback
    if (options.onComplete) {
      options.onComplete(completed, total);
    }
  }
}

// Create global storage service instance
window.storageService = new StorageService();

// Export for module usage
export default window.storageService;
