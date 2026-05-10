'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Item = { url: string; caption?: string; tag?: string };

type Props = {
  userId: string;
  initial?: string[];           // existing URLs from creators.portfolio_urls
  name: string;                 // hidden input name (JSON array of URLs)
  contentTypes?: string[];      // tag dropdown options
  max?: number;
};

export default function PortfolioUpload({ userId, initial = [], name, contentTypes = [], max = 12 }: Props) {
  const [items, setItems] = useState<Item[]>(initial.map(url => ({ url })));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (items.length + files.length > max) {
      setError(`You can upload up to ${max} items.`);
      return;
    }
    setError(null);
    setUploading(true);

    const supabase = createClient();
    const newItems: Item[] = [];

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        setError(`${file.name} is over 25 MB — skipped.`);
        continue;
      }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('portfolio')
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(upErr.message);
        continue;
      }
      const { data } = supabase.storage.from('portfolio').getPublicUrl(path);
      newItems.push({ url: data.publicUrl });
    }

    setItems(prev => [...prev, ...newItems]);
    setUploading(false);
    e.target.value = '';
  }

  function remove(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function update(idx: number, key: 'caption' | 'tag', val: string) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {items.map((it, idx) => (
            <div key={it.url} className="border-2 border-ink rounded-lg overflow-hidden bg-white">
              <div className="aspect-video bg-cream-2 relative">
                {/^.+\.(mp4|webm|mov)$/i.test(it.url) ? (
                  <video src={it.url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="absolute top-1 right-1 bg-ink/80 text-white text-xs w-6 h-6 rounded-full hover:bg-pink-bright"
                  aria-label="Remove"
                >×</button>
              </div>
              <div className="p-2 space-y-1.5">
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  defaultValue={it.caption ?? ''}
                  onChange={(e) => update(idx, 'caption', e.target.value)}
                  className="w-full text-xs border border-ink/20 rounded px-2 py-1"
                />
                {contentTypes.length > 0 && (
                  <select
                    defaultValue={it.tag ?? ''}
                    onChange={(e) => update(idx, 'tag', e.target.value)}
                    className="w-full text-xs border border-ink/20 rounded px-2 py-1 bg-white"
                  >
                    <option value="">(no tag)</option>
                    {contentTypes.map(ct => <option key={ct} value={ct}>{ct.replace(/_/g, ' ')}</option>)}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length < max && (
        <label className="btn-outline cursor-pointer text-sm inline-flex">
          {uploading ? 'Uploading…' : `+ Add (${items.length}/${max})`}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleAdd}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      )}
      {error && <p className="text-pink-bright text-xs mt-2">{error}</p>}

      <input type="hidden" name={name} value={JSON.stringify(items.map(i => i.url))} />
    </div>
  );
}
