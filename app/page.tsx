'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from '@supabase/supabase-js';
import { useState } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      console.log('File uploaded successfully:', data);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold">Upload Your Video</h1>
          <Input 
            type="file" 
            accept="video/*" 
            className="w-full max-w-md" 
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Button className="mt-4" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
    </div>
  );
}
