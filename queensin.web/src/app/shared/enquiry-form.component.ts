import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_BASE_URL } from '../core/api.config';
import { ApiResponse } from '../core/models/api.model';
import { ContentService } from '../core/services/content.service';
import { SiteService } from '../core/services/site.service';
import { IconComponent } from './icon.component';

export type EnquiryType = 'Room' | 'Mahal' | 'Contact';

const EVENT_TYPES = ['Wedding', 'Reception', 'Engagement', 'Birthday or anniversary', 'Corporate event', 'Other'];
const GUEST_COUNTS = ['Up to 100', '100 – 300', '300 – 500', '500 – 800', '800 – 1,000'];
const SUBJECTS = ['General question', 'Room reservation', 'KVR Mahal event', 'Feedback'];

/** Today as yyyy-mm-dd in the visitor's own calendar (not UTC), for the date pickers' minimum. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The website's enquiry form, in three flavours: a room enquiry, a KVR Mahal event enquiry and a general message.
 * Sends to POST /api/enquiries. A hidden "website" field catches bots (people never see or fill it). The server
 * validates everything again; its messages are shown as they are, since they are written for guests.
 */
@Component({
  selector: 'qi-enquiry-form',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (receipt(); as r) {
      <div class="border border-line bg-tint p-[clamp(28px,4vw,48px)]" role="status">
        <qi-icon name="shield" [size]="34" class="text-gold-ink" />
        <h3 class="mt-4 text-[clamp(24px,2.4vw,32px)]">Thank you, {{ firstName() }}.</h3>
        <p class="mt-3 text-muted">We have your {{ typeLabel() }} and will contact you on <b class="font-medium text-ink">{{ model.phone }}</b> shortly.</p>
        <p class="mt-3 text-[14px] text-muted">Your reference: <b class="font-medium text-ink">{{ r }}</b></p>
        <div class="mt-6 flex flex-wrap gap-3.5">
          <a [href]="site.whatsapp('Hello Queen\\'s Inn, my enquiry reference is ' + r + '.')" target="_blank" rel="noopener" class="btn btn-gold">Message us on WhatsApp</a>
          <button type="button" class="btn btn-ghost" (click)="reset()">Send another</button>
        </div>
      </div>
    } @else {
      <form class="fm" (ngSubmit)="submit()" #f="ngForm" [attr.aria-label]="typeLabel()">
        <input class="hp" name="website" [(ngModel)]="model.website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <label class="fld"><span>Full name</span><input name="name" [(ngModel)]="model.name" required maxlength="150" autocomplete="name" /></label>
        <label class="fld"><span>Phone</span><input name="phone" type="tel" [(ngModel)]="model.phone" required maxlength="20" autocomplete="tel" inputmode="tel" placeholder="+91" /></label>
        <label class="fld full"><span>Email <i class="normal-case tracking-normal">(optional)</i></span><input name="email" type="email" [(ngModel)]="model.email" maxlength="256" autocomplete="email" /></label>

        @switch (type()) {
          @case ('Room') {
            <label class="fld"><span>Check-in</span><input name="checkIn" type="date" [(ngModel)]="model.checkIn" required [min]="min" /></label>
            <label class="fld"><span>Check-out</span><input name="checkOut" type="date" [(ngModel)]="model.checkOut" [min]="model.checkIn || min" /></label>
            <label class="fld"><span>Room</span>
              <select name="roomId" [(ngModel)]="model.roomId">
                <option [ngValue]="null">Any room</option>
                @for (r of rooms(); track r.id) { <option [ngValue]="r.id">{{ r.name }}</option> }
              </select>
            </label>
            <label class="fld"><span>Guests</span><input name="guests" [(ngModel)]="model.guests" maxlength="40" placeholder="e.g. 2 adults, 1 child" /></label>
          }
          @case ('Mahal') {
            <label class="fld"><span>Type of event</span>
              <select name="eventType" [(ngModel)]="model.eventType" required>
                <option value="" disabled>Choose…</option>
                @for (t of eventTypes; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </label>
            <label class="fld"><span>Event date</span><input name="eventDate" type="date" [(ngModel)]="model.eventDate" required [min]="min" /></label>
            <label class="fld"><span>Alternative date <i class="normal-case tracking-normal">(optional)</i></span><input name="altDate" type="date" [(ngModel)]="model.altDate" [min]="min" /></label>
            <label class="fld"><span>Expected guests</span>
              <select name="guestCount" [(ngModel)]="model.guestCount">
                <option value="">Not sure yet</option>
                @for (g of guestCounts; track g) { <option [value]="g">{{ g }}</option> }
              </select>
            </label>
            <label class="fld full"><span>Rooms needed for guests <i class="normal-case tracking-normal">(optional)</i></span><input name="roomsNeeded" [(ngModel)]="model.roomsNeeded" maxlength="40" placeholder="e.g. 30 rooms for two nights" /></label>
          }
          @default {
            <label class="fld full"><span>Subject</span>
              <select name="subject" [(ngModel)]="model.subject">
                @for (s of subjects; track s) { <option [value]="s">{{ s }}</option> }
              </select>
            </label>
          }
        }

        <label class="fld full"><span>{{ type() === 'Contact' ? 'Message' : 'Anything we should know' }}@if (type() !== 'Contact') { <i class="normal-case tracking-normal"> (optional)</i> }</span>
          <textarea name="message" rows="4" [(ngModel)]="model.message" [required]="type() === 'Contact'" maxlength="2000"></textarea>
        </label>

        @if (error(); as e) { <p class="full m-0 text-[14px] text-[#B42318]" role="alert">{{ e }}</p> }
        <div class="acts">
          <button class="btn" type="submit" [disabled]="sending()">{{ sending() ? 'Sending…' : buttonText() }}</button>
          <small>We use your details only to reply to this enquiry.</small>
        </div>
      </form>
    }`,
})
export class EnquiryFormComponent {
  private readonly http = inject(HttpClient);
  protected readonly site = inject(SiteService);
  private readonly content = inject(ContentService).content;

  readonly type = input<EnquiryType>('Contact');
  /** Pre-selects a room on a room enquiry. */
  readonly roomId = input<number | null>(null);

  protected readonly eventTypes = EVENT_TYPES;
  protected readonly guestCounts = GUEST_COUNTS;
  protected readonly subjects = SUBJECTS;
  protected readonly min = today();
  protected readonly rooms = computed(() => this.content().rooms);

  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<string | null>(null);

  protected model = this.blank();

  protected readonly typeLabel = computed(() => ({ Room: 'room enquiry', Mahal: 'event enquiry', Contact: 'message' })[this.type()]);
  protected readonly buttonText = computed(() => ({ Room: 'Send enquiry', Mahal: 'Check availability', Contact: 'Send message' })[this.type()]);
  protected firstName(): string {
    return (this.model.name || '').trim().split(/\s+/)[0] || 'there';
  }

  private blank() {
    return {
      name: '', phone: '', email: '', website: '', message: '',
      checkIn: '', checkOut: '', roomId: this.roomId() as number | null, guests: '',
      eventType: '', eventDate: '', altDate: '', guestCount: '', roomsNeeded: '',
      subject: SUBJECTS[0],
    };
  }

  protected reset(): void {
    this.model = this.blank();
    this.receipt.set(null);
    this.error.set(null);
  }

  protected submit(): void {
    const m = this.model;
    this.error.set(null);
    this.sending.set(true);
    const body = {
      type: this.type(), name: m.name, phone: m.phone, email: m.email || null, website: m.website,
      message: m.message || null, sourcePage: typeof location === 'undefined' ? null : location.pathname,
      ...(this.type() === 'Room' ? { checkIn: m.checkIn || null, checkOut: m.checkOut || null, roomId: m.roomId, guests: m.guests || null } : {}),
      ...(this.type() === 'Mahal' ? { eventType: m.eventType, eventDate: m.eventDate || null, altDate: m.altDate || null, guestCount: m.guestCount || null, roomsNeeded: m.roomsNeeded || null } : {}),
      ...(this.type() === 'Contact' ? { subject: m.subject } : {}),
    };
    this.http.post<ApiResponse<{ reference: string }>>(`${API_BASE_URL}/enquiries`, body).subscribe({
      next: (r) => {
        this.sending.set(false);
        this.receipt.set(r.data?.reference ?? 'received');
      },
      error: (e: HttpErrorResponse) => {
        this.sending.set(false);
        this.error.set(
          e.status === 429 ? 'You have sent several enquiries in a short time. Please call or WhatsApp us instead, and we will help straight away.'
            : e.status === 0 ? 'We could not reach the server. Please check your connection, or call us.'
            : (e.error?.message || 'Something went wrong. Please try again, or call us.'));
      },
    });
  }
}
