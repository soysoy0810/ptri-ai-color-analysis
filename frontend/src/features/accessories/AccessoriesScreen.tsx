import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import { ACCESSORY_CATEGORIES, ACCESSORY_ITEMS } from '../../data/catalog';
import { AccessorySwatch } from '../../shared/ui/AccessorySwatch';

interface AccessoriesScreenProps {
  selectedAccessories: string[];
  gender?: string | null;
  onToggleAccessory: (itemId: string) => void;
}

/**
 * Visual accessory picker — each item shows a live-rendered preview of how it
 * will appear on the visitor (scarf drape, jewelry placement, etc.). Selected
 * items are composited onto the photo in Preview using face landmarks.
 */
export function AccessoriesScreen({ selectedAccessories, gender, onToggleAccessory }: AccessoriesScreenProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(gender === 'male' ? 'other' : 'earrings');

  return (
    <section className="screen">
      <h1 className="screen-title">Choose Accessories</h1>
      <p className="screen-sub">Tap to add — they appear on your photo in the preview.</p>

      <div className="mt-4 flex flex-col gap-2.5">
        {ACCESSORY_CATEGORIES.map((cat, ci) => {
          const items = ACCESSORY_ITEMS.filter((it) => it.categoryId === cat.id);
          const selectedInCategory = items.filter((it) => selectedAccessories.includes(it.id)).length;
          const isOpen = openCategory === cat.id;

          return (
            <motion.div
              key={cat.id}
              className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.05 }}
            >
              <button
                type="button"
                onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span className="flex-1">
                  <strong className="block text-[13px] font-extrabold uppercase tracking-wide text-navy">
                    {cat.label}
                  </strong>
                  <span className="text-xs text-muted">
                    {selectedInCategory ? `${selectedInCategory} selected` : `${items.length} options`}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-4 gap-3 px-3.5 pb-3.5 sm:grid-cols-5">
                      {items.map((item) => {
                        const active = selectedAccessories.includes(item.id);
                        return (
                          <div key={item.id} className="relative">
                            <AccessorySwatch
                              item={item}
                              active={active}
                              size={64}
                              onClick={() => onToggleAccessory(item.id)}
                            />
                            {active ? (
                              <span className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-white shadow">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
