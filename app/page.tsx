"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/components/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { SiteHeader, type SiteView } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import { GamesSection } from "@/components/games-section";
import { CommunityCenters } from "@/components/community-centers";
import { BookingModal } from "@/components/booking-modal";
import { AddCenterModal, type EditCenterInput } from "@/components/add-center-modal";
import { ProfileModal } from "@/components/profile-modal";
import { DevDashboardModal } from "@/components/dev-dashboard-modal";
import { WalletModal } from "@/components/wallet-modal";
import { type EsportsCenter } from "@/lib/data";

function AppInner() {
  const { user, isLoading } = useAuth();
  const [view, setView] = useState<SiteView>("home");
  const [bookingCenter, setBookingCenter] = useState<EsportsCenter | null>(
    null,
  );
  const [addCenterOpen, setAddCenterOpen] = useState(false);
  const [editCenter, setEditCenter] = useState<EditCenterInput | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleBookingComplete(
    center: EsportsCenter,
    review: { rating: number; comment: string },
  ) {
    setBookingCenter(null);
    showToast(
      review.rating > 0
        ? `${center.name}-д ${review.rating} од өгсөн. Баярлалаа!`
        : `${center.name} захиалга амжилттай!`,
    );
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span
            className="text-3xl font-black neon-text-cyan neon-pulse"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            E.PC
          </span>
          <div className="w-32 h-px bg-neon-cyan animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <>
      <SiteHeader
        view={view}
        onNavigate={setView}
        onRegisterPC={() => setAddCenterOpen(true)}
        onProfile={() => setProfileOpen(true)}
        onDevPanel={() => setDevPanelOpen(true)}
        onWallet={() => setWalletOpen(true)}
      />

      <main>
        {view === "home" && (
          <HeroSection onBook={setBookingCenter} onNavigate={setView} />
        )}
        {view === "games" && (
          <GamesSection onRegisterPC={() => setAddCenterOpen(true)} />
        )}
        {view === "centers" && (
          <CommunityCenters
            onBook={setBookingCenter}
            onAddCenter={() => setAddCenterOpen(true)}
          />
        )}

        {/* Footer */}
        <footer
          id="booking"
          className="border-t border-border py-12 px-4 sm:px-6"
          style={{ background: "rgba(16,16,22,0.8)" }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span
                className="text-2xl font-black neon-text-cyan"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                E.PC
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Mongolia&apos;s #1 eSports Center Platform
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-muted-foreground">
              <span>© 2025 E.PC. All rights reserved.</span>
              <span className="hidden sm:block text-border">|</span>
              <span>
                Нэвтэрсэн:{" "}
                <span className="text-neon-cyan font-semibold">
                  {user.name}
                </span>
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* Add / edit gaming center modal */}
      {(addCenterOpen || editCenter) && (
        <AddCenterModal
          editCenter={editCenter ?? undefined}
          onClose={() => {
            setAddCenterOpen(false);
            setEditCenter(null);
          }}
          onCreated={() =>
            window.dispatchEvent(new Event("epc:centers-updated"))
          }
        />
      )}

      {/* Profile modal */}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          onAddCenter={() => {
            setProfileOpen(false);
            setAddCenterOpen(true);
          }}
          onEditCenter={(c) => {
            setProfileOpen(false);
            setEditCenter({
              id: c.id,
              name: c.name,
              location: c.location,
              district: c.district,
              phone: c.phone,
              pcCount: c.pcCount,
              pricePerHour: c.pricePerHour,
              specs: c.specs,
              vipSeats: c.vipSeats,
              vipPricePerHour: c.vipPricePerHour,
            });
          }}
        />
      )}

      {/* Developer dashboard — manage ALL centers */}
      {devPanelOpen && (
        <DevDashboardModal
          onClose={() => setDevPanelOpen(false)}
          onEditCenter={(c) => {
            setDevPanelOpen(false);
            setEditCenter(c);
          }}
        />
      )}

      {/* Wallet — ecoin balance + top-up */}
      {walletOpen && <WalletModal onClose={() => setWalletOpen(false)} />}

      {/* Booking modal */}
      {bookingCenter && (
        <BookingModal
          center={bookingCenter}
          onClose={() => setBookingCenter(null)}
          onComplete={handleBookingComplete}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl text-sm font-semibold text-foreground float-in shadow-2xl whitespace-nowrap"
          style={{
            background: "rgba(16,16,22,0.97)",
            border: "1px solid rgba(0,224,255,0.4)",
            boxShadow: "0 0 20px rgba(0,224,255,0.2)",
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
