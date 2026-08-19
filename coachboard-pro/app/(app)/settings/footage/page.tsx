"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Video,
  Camera,
  Plane,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Service {
  id: string;
  name: string;
  category: "game" | "practice";
  tier: "basic" | "drone" | "full";
  price: number;
  features: string[];
  badge?: string;
}

interface FootageBooking {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  team_id: string | null;
  team_name: string;
  service_id: string;
  service_name: string;
  service_category: string;
  service_price: number;
  location: string;
  booking_date: string;
  booking_time: string;
  notes: string;
  status: "pending" | "approved" | "declined";
  admin_notes: string;
  reviewed_at: string | null;
  created_at: string;
}

const SERVICES: Service[] = [
  // Game footage
  {
    id: "game-basic",
    name: "Basic Sideline",
    category: "game",
    tier: "basic",
    price: 125,
    features: [
      "Sideline angle",
      "Overview of play field",
      "1hr game footage",
    ],
  },
  {
    id: "game-drone",
    name: "Drone",
    category: "game",
    tier: "drone",
    price: 200,
    features: [
      "All 22 End Zone angle",
      "Drone recorded",
      "Overview of entire play field",
      "1hr game footage",
    ],
    badge: "Early Adopter",
  },
  {
    id: "game-full",
    name: "Full Coverage",
    category: "game",
    tier: "full",
    price: 275,
    features: [
      "Sideline + All 22 angles",
      "Drone recorded",
      "Complete field coverage",
      "1hr game footage",
      "2 camera angles",
    ],
    badge: "Best Value",
  },
  // Practice footage
  {
    id: "practice-basic",
    name: "Basic Practice",
    category: "practice",
    tier: "basic",
    price: 150,
    features: [
      "Sideline angle",
      "Overview of practice field",
      "1.5hrs footage",
    ],
  },
  {
    id: "practice-drone",
    name: "Drone Practice",
    category: "practice",
    tier: "drone",
    price: 250,
    features: [
      "Drone view",
      "Overview of entire field",
      "1.5hrs footage",
      "Subject to availability",
    ],
  },
  {
    id: "practice-full",
    name: "Full Coverage",
    category: "practice",
    tier: "full",
    price: 350,
    features: [
      "Sideline + Drone angles",
      "Complete field coverage",
      "1.5hrs footage",
      "Subject to availability",
    ],
    badge: "Best Value",
  },
];

function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: (service: Service) => void;
}) {
  const tierIcon =
    service.tier === "drone" ? Plane :
    service.tier === "full" ? Video :
    Camera;
  const Icon = tierIcon;

  return (
    <Card className="relative flex flex-col gap-3 p-5">
      {service.badge && (
        <div className="absolute right-3 top-3">
          <Badge variant="primary">{service.badge}</Badge>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="font-bold">{service.name}</h3>
      </div>
      <p className="text-2xl font-extrabold">
        ${service.price}
        <span className="text-sm font-normal text-muted">/session</span>
      </p>
      <ul className="flex flex-1 flex-col gap-1.5">
        {service.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted">
            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-success" />
            {f}
          </li>
        ))}
      </ul>
      <Button variant="primary" onClick={() => onBook(service)}>
        Book Now
      </Button>
    </Card>
  );
}

function StatusBadge({ status }: { status: FootageBooking["status"] }) {
  if (status === "approved") {
    return (
      <Badge variant="primary" className="gap-1">
        <CheckCircle className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  if (status === "declined") {
    return (
      <Badge className="gap-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <XCircle className="h-3 w-3" /> Declined
      </Badge>
    );
  }
  return (
    <Badge className="gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export default function FootageServicesPage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<"game" | "practice">("game");
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showBookings, setShowBookings] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<FootageBooking | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const supabase = createClient();

  // Fetch user's teams for the booking form
  const { data: teams = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["my-teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "accepted");
      if (!memberships?.length) return [];
      const teamIds = memberships.map((m: { team_id: string }) => m.team_id);
      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .in("id", teamIds)
        .eq("status", "active");
      return (teamData ?? []) as { id: string; name: string }[];
    },
    enabled: !!user,
  });

  // Only footage service accounts (listed in env var) can approve bookings
  // Supports exact emails and @domain wildcards (e.g. @coachboard.kkmsports.xyz)
  const footageAdminEntries = (process.env.NEXT_PUBLIC_FOOTAGE_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const userEmail = (user?.email || profile?.email || "").toLowerCase();
  const isFootageAdmin = footageAdminEntries.some((entry) =>
    entry.startsWith("@")
      ? userEmail.endsWith(entry)
      : userEmail === entry
  );

  const visibleServices = SERVICES.filter((s) => s.category === category);

  // Fetch bookings (admin gets all, regular user gets own)
  const { data: bookings = [] } = useQuery<FootageBooking[]>({
    queryKey: ["footage-bookings", user?.id, isFootageAdmin],
    queryFn: async () => {
      if (!user) return [];
      const url = isFootageAdmin
        ? "/api/bookings?all=true"
        : `/api/bookings?userId=${user.id}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const pastBookings = bookings.filter((b) => b.status !== "pending");

  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, notes: aNotes }: { id: string; action: "approved" | "declined"; notes: string }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes: aNotes }),
      });
      if (!res.ok) throw new Error("Failed to update booking");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["footage-bookings"] });
      setReviewBooking(null);
      setAdminNotes("");
      toast(
        variables.action === "approved"
          ? "Booking approved! The customer has been notified."
          : "Booking declined. The customer has been notified.",
        "success"
      );
    },
    onError: () => {
      toast("Failed to update booking.", "error");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingService) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          userEmail: user?.email ?? profile?.email,
          userName: profile?.full_name,
          teamId: selectedTeamId || teams[0]?.id || null,
          teamName: (teams.find((t) => t.id === (selectedTeamId || teams[0]?.id))?.name) || "",
          service: {
            id: bookingService.id,
            name: bookingService.name,
            category: bookingService.category,
            price: bookingService.price,
          },
          location,
          date,
          time,
          notes,
        }),
      });

      if (!res.ok) throw new Error("Booking failed");

      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["footage-bookings"] });
      toast("Booking request submitted! Our team will confirm availability.", "success");
    } catch {
      toast("Failed to submit booking. Please try again.", "error");
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setBookingService(null);
    setLocation("");
    setDate("");
    setTime("");
    setNotes("");
    setSelectedTeamId("");
    setSubmitted(false);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-extrabold">Footage Services</h1>
        <p className="text-sm text-muted">
          Professional game and practice footage recorded by our video team.
          All bookings are subject to availability.
        </p>
      </div>

      {/* Admin: Pending Booking Requests */}
      {isFootageAdmin && pendingBookings.length > 0 && (
        <Card className="flex flex-col gap-4 border-amber-300 p-6 dark:border-amber-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Pending Booking Requests
              <Badge>{pendingBookings.length}</Badge>
            </CardTitle>
            <CardDescription>
              Review and approve or decline footage booking requests.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {pendingBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{booking.service_name}</span>
                    <Badge>{booking.service_category}</Badge>
                    <span className="text-sm text-muted">${booking.service_price}</span>
                  </div>
                  <p className="text-sm text-muted">
                    {booking.user_name || booking.user_email}
                    {booking.team_name && <> — <span className="font-medium">{booking.team_name}</span></>}
                    {booking.team_id && <span className="ml-1 font-mono text-[10px]">({booking.team_id.slice(0, 8)})</span>}
                    {" "}— {booking.location} — {booking.booking_date} at {booking.booking_time}
                  </p>
                  {booking.notes && (
                    <p className="text-xs text-muted">Notes: {booking.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setReviewBooking(booking);
                      setAdminNotes("");
                    }}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Approve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReviewBooking(booking);
                      setAdminNotes("");
                    }}
                  >
                    <XCircle className="h-3 w-3" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category Toggle */}
      <div className="flex rounded-xl border border-border bg-card p-1">
        <button
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            category === "game"
              ? "bg-primary-bg text-text shadow-sm"
              : "text-muted hover:text-text"
          }`}
          onClick={() => setCategory("game")}
        >
          <Video className="h-4 w-4" />
          Game Footage
        </button>
        <button
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            category === "practice"
              ? "bg-primary-bg text-text shadow-sm"
              : "text-muted hover:text-text"
          }`}
          onClick={() => setCategory("practice")}
        >
          <Camera className="h-4 w-4" />
          Practice Footage
        </button>
      </div>

      {/* Service Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleServices.map((s) => (
          <ServiceCard key={s.id} service={s} onBook={setBookingService} />
        ))}
      </div>

      <p className="text-xs text-muted">
        All footage is uploaded to your Coachboard Pro account within 24–48 hours of recording.
        Pricing is per session. Availability varies by region.
      </p>

      {/* Booking History */}
      {bookings.length > 0 && (
        <Card className="flex flex-col gap-4 p-6">
          <button
            className="flex items-center justify-between"
            onClick={() => setShowBookings(!showBookings)}
          >
            <CardHeader>
              <CardTitle>
                {isFootageAdmin ? "All Bookings" : "My Bookings"}
              </CardTitle>
              <CardDescription>
                {isFootageAdmin
                  ? `${bookings.length} total booking${bookings.length !== 1 ? "s" : ""}`
                  : `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </CardHeader>
            {showBookings ? (
              <ChevronUp className="h-5 w-5 text-muted" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted" />
            )}
          </button>
          {showBookings && (
            <div className="flex flex-col gap-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{booking.service_name}</span>
                      <StatusBadge status={booking.status} />
                      <span className="text-sm text-muted">${booking.service_price}</span>
                    </div>
                    <p className="text-sm text-muted">
                      {isFootageAdmin && <span className="font-medium">{booking.user_name || booking.user_email} — </span>}
                      {booking.location} — {booking.booking_date} at {booking.booking_time}
                    </p>
                    {booking.admin_notes && (
                      <p className="text-xs text-muted">Admin notes: {booking.admin_notes}</p>
                    )}
                  </div>
                  {isFootageAdmin && booking.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setReviewBooking(booking);
                          setAdminNotes("");
                        }}
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Booking Dialog */}
      <Dialog open={!!bookingService} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {submitted ? "Request Submitted" : `Book: ${bookingService?.name}`}
            </DialogTitle>
            {!submitted && (
              <DialogDescription>
                {bookingService?.category === "game" ? "Game" : "Practice"} footage — ${bookingService?.price}/session.
                Our team will review and confirm availability.
              </DialogDescription>
            )}
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle className="h-10 w-10 text-success" />
              <p className="text-sm text-muted">
                We've received your booking request for <strong>{bookingService?.name}</strong>.
                Our video team will reach out within 24 hours to confirm availability and details.
              </p>
              <Button variant="primary" onClick={resetForm}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {teams.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Team</label>
                  {teams.length === 1 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-input px-3 py-2 text-sm">
                      <Users className="h-4 w-4 text-muted" />
                      {teams[0].name}
                      <span className="ml-auto text-xs text-muted font-mono">{teams[0].id.slice(0, 8)}</span>
                    </div>
                  ) : (
                    <select
                      className="flex h-10 rounded-xl border border-border bg-input px-3 py-2 text-sm text-text"
                      value={selectedTeamId || teams[0]?.id}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="Field name, address, or venue"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Time</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Additional Notes</label>
                <Textarea
                  placeholder="Any special requirements, parking info, field details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Submitting..." : `Submit Request — $${bookingService?.price}`}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog (Admin) */}
      <Dialog open={!!reviewBooking} onOpenChange={(open) => !open && setReviewBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Booking</DialogTitle>
            <DialogDescription>
              Approve or decline this footage booking request. The customer will be
              notified by email and in-app notification.
            </DialogDescription>
          </DialogHeader>
          {reviewBooking && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Service</span>
                    <span className="font-medium">{reviewBooking.service_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Price</span>
                    <span className="font-medium">${reviewBooking.service_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Customer</span>
                    <span className="font-medium">{reviewBooking.user_name || reviewBooking.user_email}</span>
                  </div>
                  {reviewBooking.team_name && (
                    <div className="flex justify-between">
                      <span className="text-muted">Team</span>
                      <span className="font-medium">
                        {reviewBooking.team_name}
                        {reviewBooking.team_id && (
                          <span className="ml-1 font-mono text-[10px] text-muted">({reviewBooking.team_id.slice(0, 8)})</span>
                        )}
                      </span>
                    </div>
                  )}
                  {reviewBooking.team_id && (
                    <div className="flex justify-between">
                      <span className="text-muted">Team ID</span>
                      <span className="font-medium font-mono text-xs">{reviewBooking.team_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted">Location</span>
                    <span className="font-medium">{reviewBooking.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Date</span>
                    <span className="font-medium">{reviewBooking.booking_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Time</span>
                    <span className="font-medium">{reviewBooking.booking_time}</span>
                  </div>
                  {reviewBooking.notes && (
                    <div className="flex justify-between">
                      <span className="text-muted">Notes</span>
                      <span className="font-medium">{reviewBooking.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  placeholder="Add notes visible to the customer..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({
                      id: reviewBooking.id,
                      action: "approved",
                      notes: adminNotes,
                    })
                  }
                >
                  <CheckCircle className="h-4 w-4" />
                  {reviewMutation.isPending ? "Processing..." : "Approve"}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 border border-border"
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({
                      id: reviewBooking.id,
                      action: "declined",
                      notes: adminNotes,
                    })
                  }
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
