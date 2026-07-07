/*
  Black announcement bar — pronk-style. Single editable line.
  Client supplies final copy; edit ANNOUNCEMENT_TEXT only.
*/
export const ANNOUNCEMENT_TEXT = 'Get flat 5% off on prepaid orders';

export default function AnnouncementBar() {
  return (
    <div className="bg-black py-2 text-center">
      <p className="font-display text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
        {ANNOUNCEMENT_TEXT}
      </p>
    </div>
  );
}
