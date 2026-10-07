import { Directive, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { SiteService } from '../core/services/site.service';

/**
 * Turns an <a> into the site's "Reserve" action, whatever the admin chose in Site settings: a WhatsApp chat with a
 * ready-typed message, a phone call, or the room enquiry form. Optionally pass the message to type, e.g. the room name:
 * <a [qiReserve]="'I would like the Family Room'">.
 */
@Directive({
  selector: 'a[qiReserve]',
  host: {
    '[attr.href]': 'target().href',
    '[attr.target]': 'target().newTab ? "_blank" : null',
    '[attr.rel]': 'target().newTab ? "noopener" : null',
    '(click)': 'onClick($event)',
  },
})
export class ReserveLinkDirective {
  private readonly site = inject(SiteService);
  private readonly router = inject(Router);

  readonly message = input('', { alias: 'qiReserve' });
  protected readonly target = computed(() => this.site.reserve(this.message() || undefined));

  protected onClick(e: MouseEvent): void {
    const t = this.target();
    if (t.external || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;   // let the browser handle new-tab clicks
    e.preventDefault();
    this.router.navigateByUrl(t.href);   // stay inside the app, so the page change is smooth
  }
}
