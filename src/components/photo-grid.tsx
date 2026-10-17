import { t } from "@/i18n";

export function PhotoGrid({ photos }: { photos: { id: string; width: number; height: number }[] }) {
  if (photos.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((p, i) => (
        <li key={p.id}>
          <a href={`/api/myndir/${p.id}`} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border border-line bg-subtle">
            {/* Private, authorised images: served directly rather than through the public image optimiser. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/myndir/${p.id}`}
              alt={`${t("request.photosTitle")} ${i + 1}`}
              width={p.width}
              height={p.height}
              loading="lazy"
              className="aspect-[4/3] h-auto w-full object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
