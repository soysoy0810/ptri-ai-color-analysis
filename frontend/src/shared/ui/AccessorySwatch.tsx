import { useMemo } from 'react';
import type { AccessoryItem } from '../../data/catalog';
import { textileSrc } from '../../data/textiles';
import { renderAccessoryThumbnail } from '../lib/accessoryCompositor';

interface AccessorySwatchProps {
  item: AccessoryItem;
  active?: boolean;
  size?: number;
  onClick?: () => void;
  showLabel?: boolean;
}

export function AccessorySwatch({ item, active, size = 56, onClick, showLabel = true }: AccessorySwatchProps) {
  const thumb = useMemo(
    () => item.photoSrc || textileSrc(item.textureId) || renderAccessoryThumbnail(item, size),
    [item, size],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span
        className={`overflow-hidden rounded-xl border-2 shadow-sm transition ${
          active ? 'border-accent ring-2 ring-accent/30' : 'border-line'
        }`}
        style={{ width: size, height: size }}
      >
        <img src={thumb} alt={item.name} className="h-full w-full object-cover" draggable={false} />
      </span>
      {showLabel ? (
        <span className={`max-w-[72px] text-center text-[8px] font-bold leading-tight ${active ? 'text-accent' : 'text-navy'}`}>
          {item.name}
        </span>
      ) : null}
    </button>
  );
}
