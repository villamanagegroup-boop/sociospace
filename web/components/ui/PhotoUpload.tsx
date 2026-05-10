'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = {
  userId: string;
  bucket: 'avatars' | 'logos';
  initialUrl?: string | null;
  // Hidden input name so the URL submits with the surrounding form
  name: string;
};

export default function PhotoUpload({ userId, bucket, initialUrl, name }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }
    setError(null);
    setUploading(true);

    const supabase = createClient();
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-ink bg-cream-2 flex items-center justify-center text-ink-4 text-sm">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="w-full h-full object-cover" />
        ) : (
          'No photo'
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="btn-outline cursor-pointer text-xs">
          {uploading ? 'Uploading…' : url ? 'Replace photo' : 'Upload photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>
        {error && <span className="text-xs text-pink-bright">{error}</span>}
      </div>

      <input type="hidden" name={name} value={url ?? ''} />
    </div>
  );
}
