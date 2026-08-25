import { supabase } from './supabase';

/**
 * Uploads a food photo to the `food-photos` bucket and returns its
 * public URL. Files are namespaced by user id to avoid collisions,
 * e.g. "user-abc123/1719350000-sandwiches.jpg".
 */
export async function uploadFoodPhoto(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('food-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Photo upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from('food-photos').getPublicUrl(filePath);

  if (!data?.publicUrl) {
    throw new Error('Upload succeeded but no public URL was returned.');
  }

  return data.publicUrl;
}
