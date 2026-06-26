import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShoppingBag, Check, ShieldCheck } from '@phosphor-icons/react';
import { useProduct, useProductRecommendations } from '../lib/shopify/hooks.js';
import { useCart } from '../context/CartContext.jsx';
import Gallery from '../components/Gallery.jsx';
import VariantSelector from '../components/VariantSelector.jsx';
import Accordion from '../components/Accordion.jsx';
import StylingTips from '../components/StylingTips.jsx';
import { ProductCardSkeleton } from '../components/ProductCard.jsx';
import { trackEvent, EVENTS } from '../lib/analytics/ga4.js';

function fmt(amount, currencyCode = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(amount);
}

export default function Product() {
  const { handle } = useParams();
  const { data: product, isLoading, isError } = useProduct(handle);
  const { data: recommendations = [] } = useProductRecommendations(product?.id);
  const { addLine, count } = useCart();

  const variants = product?.variants?.edges?.map((e) => e.node) ?? [];
  const images   = product?.images?.edges?.map((e) => e.node) ?? [];
  const price    = variants[0]?.price;

  const [selected, setSelected]   = useState(null);
  const [addedMsg, setAddedMsg]   = useState(false);

  // Default to first available variant.
  useEffect(() => {
    if (variants.length && !selected) {
      setSelected(variants.find((v) => v.availableForSale) ?? variants[0]);
    }
  }, [variants.length]);

  // GA4 view_item.
  useEffect(() => {
    if (product) {
      trackEvent(EVENTS.VIEW_ITEM, {
        items: [{ item_id: product.id, item_name: product.title, price: price?.amount }],
      });
    }
  }, [product?.id]);

  const handleAddToBag = () => {
    if (!selected) return;
    addLine({
      merchandiseId: selected.id,
      title: product.title,
      variant: selected.title,
      price: parseFloat(selected.price?.amount ?? 0),
      image: images[0]?.url,
    });
    setAddedMsg(true);
    setTimeout(() => setAddedMsg(false), 2000);
  };

  const soldOut = selected ? !selected.availableForSale : false;

  const accordionItems = [
    {
      label: 'Technical Specs',
      content: product?.metafields?.find?.((m) => m?.key === 'specs')?.value
        ?? 'Heavyweight 450gsm French terry. Drop-shoulder silhouette. Industrial hardware at cuffs. Reinforced stitching at stress points. Oversized kangaroo pocket.',
    },
    {
      label: 'Care Instructions',
      content: product?.metafields?.find?.((m) => m?.key === 'care')?.value
        ?? 'Machine wash cold. Tumble dry low. Do not bleach. Iron on low heat if needed. Wash inside out to preserve finish.',
    },
  ];

  if (isLoading) return <ProductSkeleton />;

  if (isError || !product) return (
    <div className="mx-auto max-w-[1280px] px-6 py-24 text-center lg:px-16">
      <span className="bg-acid px-3 py-1 font-display text-[10px] font-black uppercase tracking-widest text-black">
        Not Found
      </span>
      <p className="mt-6 font-display text-xs uppercase tracking-widest text-secondary">
        Product not found. <Link to="/shop" className="text-acid hover:underline">Back to shop.</Link>
      </p>
    </div>
  );

  return (
    <>
      {/* Main product section. */}
      <div className="mx-auto max-w-[1280px] px-6 py-10 lg:px-16">
        {/* Breadcrumb. */}
        <nav className="mb-8 flex items-center gap-2 font-display text-[10px] uppercase tracking-widest text-secondary">
          <Link to="/" className="hover:text-acid">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-acid">Shop</Link>
          <span>/</span>
          <span className="text-primary">{product.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left — Gallery. */}
          <Gallery images={images} />

          {/* Right — Info. */}
          <div className="flex flex-col gap-6">
            {/* Badge. */}
            {product.tags?.includes('new-drop') && (
              <span className="inline-block w-fit bg-acid px-3 py-1 font-display text-[9px] font-black uppercase tracking-widest text-black">
                New Drop
              </span>
            )}

            {/* Title. */}
            <h1 className="font-display text-3xl font-black uppercase leading-tight tracking-tight text-primary md:text-4xl">
              {product.title}
            </h1>

            {/* Price. */}
            {price && (
              <p className="font-display text-2xl font-black text-acid">
                {fmt(price.amount, price.currencyCode)}
              </p>
            )}

            {/* Description. */}
            {product.description && (
              <p className="text-sm leading-relaxed text-secondary">
                {product.description}
              </p>
            )}

            {/* Divider. */}
            <div className="h-px bg-hairline" />

            {/* Variant selector. */}
            <VariantSelector
              variants={variants}
              selected={selected}
              onSelect={setSelected}
            />

            {/* Add to bag. */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleAddToBag}
                disabled={soldOut || !selected}
                className={`flex w-full items-center justify-center gap-3 py-4 font-display text-sm font-black uppercase tracking-widest transition-colors active:scale-[0.98]
                  ${soldOut
                    ? 'cursor-not-allowed bg-elevated text-secondary'
                    : addedMsg
                    ? 'bg-acid text-black'
                    : 'bg-primary text-base hover:bg-acid hover:text-black'
                  }`}
              >
                {addedMsg ? (
                  <>Added <Check size={16} weight="bold" /></>
                ) : soldOut ? (
                  'Sold Out'
                ) : (
                  <><ShoppingBag size={16} weight="regular" /> Add To Bag</>
                )}
              </button>

              <p className="flex items-center justify-center gap-2 text-center font-display text-[10px] uppercase tracking-widest text-secondary">
                <ShieldCheck size={12} weight="regular" />
                Free expedited shipping on orders over $100
              </p>
            </div>

            {/* Accordions. */}
            <Accordion items={accordionItems} />
          </div>
        </div>
      </div>

      {/* Styling tips / cross-sell. */}
      <StylingTips products={recommendations} />
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1280px] gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:px-16">
      <div className="aspect-[3/4] animate-pulse bg-elevated" />
      <div className="flex flex-col gap-6">
        <div className="h-5 w-1/4 animate-pulse bg-elevated" />
        <div className="h-10 w-3/4 animate-pulse bg-elevated" />
        <div className="h-6 w-1/5 animate-pulse bg-elevated" />
        <div className="h-20 animate-pulse bg-elevated" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-12 animate-pulse bg-elevated" />
          ))}
        </div>
        <div className="h-14 animate-pulse bg-elevated" />
      </div>
    </div>
  );
}

