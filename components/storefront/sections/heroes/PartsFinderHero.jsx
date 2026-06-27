'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Car, Bike, CreditCard, ScanLine,
  Droplets, Filter, CircleDot, Cog, Settings2, Wrench, Bath, Zap, Circle,
} from 'lucide-react';
import { HeroCarousel } from './HeroCarousel';
import { AUTO_PARTS_MARQUEE_BRANDS } from '@/lib/storefront/heroPresets';
import {
  PARTS_BODY_TYPES,
  PARTS_VEHICLE_CLASSES,
  PARTS_CAR_MAKES,
  PARTS_MOTO_MAKES,
  PARTS_VEHICLE_YEARS,
  getModelsForMake,
  getEnginesForVehicle,
  getEngineNosForVehicle,
  buildPartsProductsUrl,
} from '@/lib/storefront/partsFinder';
import { AutoBrandMarquee } from '@/components/storefront/sections/shared/AutoBrandMarquee';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  droplet: Droplets,
  wiper: Settings2,
  disc: CircleDot,
  filter: Filter,
  engine: Cog,
  gear: Settings2,
  suspension: Wrench,
  steering: Settings2,
  wrench: Wrench,
  pipe: Settings2,
  bath: Bath,
  zap: Zap,
  nut: Circle,
};

function FinderCard({ children, className, imageUrl, imageAlt = '', accent }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-neutral-900/10 backdrop-blur-sm',
        'ring-1 ring-neutral-900/[0.04] transition-shadow duration-300 hover:shadow-2xl hover:shadow-neutral-900/12',
        className
      )}
    >
      {children}
      {imageUrl ? (
        <div
          className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-[28%] max-w-[180px] sm:block lg:w-[24%] lg:max-w-[220px]"
          aria-hidden
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
            style={{ backgroundImage: `url(${imageUrl})` }}
            role="img"
            aria-label={imageAlt}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to left, transparent 0%, rgba(255,255,255,0.55) 45%, white 100%)`,
            }}
          />
          <div
            className="absolute inset-y-0 left-0 w-8 opacity-30"
            style={{ background: `linear-gradient(90deg, ${accent || '#cd232a'}22, transparent)` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Autoparts-style finder hero: part #, part size, vehicle drill-down, plate, VIN.
 */
export function PartsFinderHero({ preset, businessDomain, accent, accentDark }) {
  const router = useRouter();
  const base = `/store/${businessDomain}/products`;
  const showVehicleFinder = preset?.finderMode !== 'hardware';
  const brandAccent = accent || '#cd232a';
  const brandAccentDark = accentDark || brandAccent;

  const [partTab, setPartTab] = useState('number');
  const [partQuery, setPartQuery] = useState('');
  const [vehicleType, setVehicleType] = useState('car');
  const [sgModelsOnly, setSgModelsOnly] = useState(true);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [body, setBody] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [vehicleClass, setVehicleClass] = useState('');
  const [year, setYear] = useState('');
  const [engine, setEngine] = useState('');
  const [plate, setPlate] = useState('');
  const [vin, setVin] = useState('');

  const makes = vehicleType === 'moto' ? PARTS_MOTO_MAKES : PARTS_CAR_MAKES;
  const models = useMemo(
    () => getModelsForMake(make, { vehicleType, sgOnly: sgModelsOnly }),
    [make, vehicleType, sgModelsOnly]
  );
  const engines = useMemo(() => getEnginesForVehicle(make, model), [make, model]);
  const engineNos = useMemo(() => getEngineNosForVehicle(make, model, engine), [make, model, engine]);

  const navigate = (params) => {
    router.push(buildPartsProductsUrl(base, params));
  };

  const goPartSearch = () => {
    const term = String(partQuery || '').trim();
    if (!term) return;
    navigate({
      search: term,
      searchMode: partTab === 'number' ? 'partNumber' : 'partSize',
    });
  };

  const goPlateSearch = () => {
    const term = String(plate || '').trim();
    if (!term) return;
    navigate({ search: term, searchMode: 'plate' });
  };

  const goVinSearch = () => {
    const term = String(vin || '').trim();
    if (!term) return;
    navigate({ search: term, searchMode: 'vin' });
  };

  const goVehicleSearch = () => {
    if (!make) return;
    navigate({
      brand: make,
      model: model || undefined,
      year: year || undefined,
      body: body || undefined,
      engine: engine || undefined,
      engineNo: engineNo || undefined,
      vehicleClass: vehicleClass || undefined,
      vehicleType,
    });
  };

  const goCategory = (cat) => {
    if (cat?.href) {
      router.push(cat.href);
      return;
    }
    const slug = typeof cat === 'string' ? cat : cat?.slug;
    if (!slug) {
      router.push(base);
      return;
    }
    router.push(`${base}?category=${encodeURIComponent(slug)}`);
  };

  const selectClass =
    'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-neutral-400 focus:ring-2 disabled:bg-neutral-50 disabled:text-neutral-400';

  const inputClass =
    'min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-neutral-400 focus:ring-2 disabled:bg-neutral-50';

  const searchBtnClass =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 hover:shadow-lg motion-safe:hover:scale-[1.02]';

  const focusRingStyle = { '--tw-ring-color': `${brandAccent}33` };

  return (
    <section
      className="relative bg-gradient-to-b from-neutral-100 via-neutral-50 to-white pb-8"
      style={{ '--store-accent': brandAccent, '--store-accent-dark': brandAccentDark }}
    >
      <HeroCarousel
        slides={preset.slides}
        accent={brandAccent}
        variant="parts"
        minHeight="min-h-[320px] sm:min-h-[420px] lg:min-h-[480px]"
        contentClassName="pb-28 sm:pb-32 lg:pb-36"
      />

      <div className="relative z-20 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="-mt-20 sm:-mt-28 lg:-mt-32">
          <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
            {/* Left column: part # / size + optional plate / VIN */}
            <div className={cn('flex flex-col gap-3', showVehicleFinder ? 'lg:col-span-5' : 'lg:col-span-12')}>
              <FinderCard
                className="p-4 sm:p-5"
                imageUrl="https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80&auto=format&fit=crop"
                imageAlt="Auto parts"
                accent={brandAccent}
              >
                <div className="relative z-10 max-w-md lg:max-w-[85%]">
                  <div className="mb-3 flex gap-1 rounded-xl bg-neutral-100/90 p-1">
                    {[
                      { id: 'number', label: 'Part number' },
                      { id: 'size', label: 'Part size' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPartTab(tab.id)}
                        className={cn(
                          'flex-1 rounded-lg py-2 text-xs font-semibold transition sm:text-sm',
                          partTab === tab.id
                            ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-900/5'
                            : 'text-neutral-500 hover:text-neutral-700'
                        )}
                        style={partTab === tab.id ? { color: brandAccent } : undefined}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={partQuery}
                      onChange={(e) => setPartQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && goPartSearch()}
                      placeholder={partTab === 'number' ? 'Example: 04465-13020' : 'Example: Oil filter Toyota'}
                      className={inputClass}
                      style={focusRingStyle}
                    />
                    <button
                      type="button"
                      onClick={goPartSearch}
                      className={searchBtnClass}
                      style={{ backgroundColor: brandAccent }}
                    >
                      <Search className="h-4 w-4" />
                      <span className="hidden sm:inline">Search</span>
                    </button>
                  </div>
                </div>
              </FinderCard>

              {showVehicleFinder ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FinderCard className="p-3 sm:p-4" accent={brandAccent}>
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <CreditCard className="h-3.5 w-3.5" style={{ color: brandAccent }} />
                      Vehicle plate no
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && goPlateSearch()}
                        placeholder="SBA1234A"
                        className={cn(inputClass, 'px-2 py-2 text-xs sm:text-sm')}
                        style={focusRingStyle}
                      />
                      <button
                        type="button"
                        onClick={goPlateSearch}
                        className="rounded-lg px-2.5 py-2 text-white shadow-sm transition hover:opacity-95"
                        style={{ backgroundColor: brandAccent }}
                        aria-label="Search by plate"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </FinderCard>

                <FinderCard className="p-3 sm:p-4" accent={brandAccent}>
                  <div className="relative z-10">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <ScanLine className="h-3.5 w-3.5" style={{ color: brandAccent }} />
                      VIN or chassis no
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={vin}
                        onChange={(e) => setVin(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && goVinSearch()}
                        placeholder="Last 6 digits"
                        className={cn(inputClass, 'px-2 py-2 text-xs sm:text-sm')}
                        style={focusRingStyle}
                      />
                      <button
                        type="button"
                        onClick={goVinSearch}
                        className="rounded-lg px-2.5 py-2 text-white shadow-sm transition hover:opacity-95"
                        style={{ backgroundColor: brandAccent }}
                        aria-label="Search by VIN"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </FinderCard>
              </div>
              ) : null}
            </div>

            {/* Right: vehicle finder (auto-parts / auto-workshop only) */}
            {showVehicleFinder ? (
            <FinderCard
              className="p-4 sm:p-5 lg:col-span-7"
              imageUrl="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600&q=80&auto=format&fit=crop"
              imageAlt="Vehicle"
              accent={brandAccent}
            >
              <div className="relative z-10 lg:pr-[18%]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-neutral-900">Vehicle search</span>
                    <div className="flex gap-1 rounded-xl bg-neutral-100/90 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleType('car');
                          setMake('');
                          setModel('');
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm',
                          vehicleType === 'car'
                            ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-900/5'
                            : 'text-neutral-500 hover:text-neutral-700'
                        )}
                        style={vehicleType === 'car' ? { color: brandAccent } : undefined}
                      >
                        <Car className="h-4 w-4" /> Car
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVehicleType('moto');
                          setMake('');
                          setModel('');
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm',
                          vehicleType === 'moto'
                            ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-900/5'
                            : 'text-neutral-500 hover:text-neutral-700'
                        )}
                        style={vehicleType === 'moto' ? { color: brandAccent } : undefined}
                      >
                        <Bike className="h-4 w-4" /> Moto
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-neutral-600">
                    <span className="font-semibold text-neutral-700">Filter models</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSgModelsOnly((v) => !v);
                        setModel('');
                      }}
                      className="relative h-6 w-11 rounded-full transition-colors"
                      style={{ backgroundColor: sgModelsOnly ? brandAccent : '#d4d4d4' }}
                      aria-pressed={sgModelsOnly}
                      aria-label={sgModelsOnly ? 'Showing SG models only' : 'Showing all models'}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                          sgModelsOnly ? 'left-5' : 'left-0.5'
                        )}
                      />
                    </button>
                    <span className="hidden sm:inline">{sgModelsOnly ? 'SG models only' : 'All models'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Make
                    </label>
                    <select
                      value={make}
                      onChange={(e) => {
                        setMake(e.target.value);
                        setModel('');
                        setEngine('');
                        setEngineNo('');
                      }}
                      className={selectClass}
                      style={focusRingStyle}
                    >
                      <option value="">Select make</option>
                      {makes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Model
                    </label>
                    <select
                      value={model}
                      onChange={(e) => {
                        setModel(e.target.value);
                        setEngine('');
                        setEngineNo('');
                      }}
                      className={selectClass}
                      disabled={!make}
                    >
                      <option value="">Select model</option>
                      {models.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Body
                    </label>
                    <select value={body} onChange={(e) => setBody(e.target.value)} className={selectClass}>
                      <option value="">Select body</option>
                      {PARTS_BODY_TYPES.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Engine No
                    </label>
                    <select
                      value={engineNo}
                      onChange={(e) => setEngineNo(e.target.value)}
                      className={selectClass}
                      disabled={!engine}
                    >
                      <option value="">Select engine no</option>
                      {engineNos.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </label>
                    <select value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value)} className={selectClass}>
                      <option value="">Select class</option>
                      {PARTS_VEHICLE_CLASSES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Year
                    </label>
                    <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass}>
                      <option value="">Select year</option>
                      {PARTS_VEHICLE_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Engine
                    </label>
                    <select
                      value={engine}
                      onChange={(e) => {
                        setEngine(e.target.value);
                        setEngineNo('');
                      }}
                      className={selectClass}
                      disabled={!model}
                    >
                      <option value="">Select engine</option>
                      {engines.map((eng) => (
                        <option key={eng} value={eng}>{eng}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                  <p className="text-xs text-neutral-500">
                    Matching parts from our catalog by make, model, and fitment.
                  </p>
                  <button
                    type="button"
                    onClick={goVehicleSearch}
                    disabled={!make}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 hover:shadow-lg disabled:opacity-40 motion-safe:hover:scale-[1.02]"
                    style={{ background: `linear-gradient(135deg, ${brandAccent} 0%, ${brandAccentDark} 100%)` }}
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </div>
              </div>
            </FinderCard>
            ) : null}
          </div>

          {preset.categoryShortcuts?.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/80 bg-white/95 px-3 py-5 shadow-lg shadow-neutral-900/5 backdrop-blur-sm sm:px-6">
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Shop by category
              </p>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 sm:gap-5">
                {preset.categoryShortcuts.slice(0, 6).map((cat) => {
                  const Icon = ICON_MAP[cat.icon] || Filter;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => goCategory(cat)}
                      className="group flex flex-col items-center gap-2 text-center"
                    >
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full border-2 bg-white transition group-hover:scale-105 group-hover:shadow-md sm:h-14 sm:w-14"
                        style={{ borderColor: brandAccent, color: brandAccent, backgroundColor: `${brandAccent}08` }}
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
                      </div>
                      <span className="text-[10px] font-semibold leading-tight text-neutral-700 sm:text-xs">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {showVehicleFinder ? (
          <div className="mt-4 rounded-2xl border border-white/80 bg-white/95 px-3 py-4 shadow-lg shadow-neutral-900/5 backdrop-blur-sm sm:px-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Shop parts by vehicle make
            </p>
            <AutoBrandMarquee
              brands={AUTO_PARTS_MARQUEE_BRANDS.map((b) => ({
                ...b,
                href: buildPartsProductsUrl(base, { brand: b.name }),
              }))}
              productsUrl={base}
              variant="parts"
              accent={brandAccent}
              viewAllLabel="View all makes"
              className="mb-0"
            />
          </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
