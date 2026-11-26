// The price report sheet.
import { FUEL_LABEL, fmtPrice, stationName, stationWhere } from '../domain/format'
import type { Ranked } from '../domain/ranking'
import type { Jauge } from '../state'
import { IconFlag } from './icons'
import { BrandBadge } from './pieces'

/** Opens from "Prix inexact ?" on a station: says whose price it is, then links to the Régie's own site.
 *  (Its site has no page per station and no report form; its own button only writes an e-mail to
 *  req_enquete@regie-energie.qc.ca. A pre-written e-mail from Jauge was tried on 2026-11-26 and set aside for now.) */
export function ReportPrice({ j, r }: { j: Jauge; r: Ranked }) {
  return (
    <div className="report">
      <h2>Ce prix est inexact ?</h2>
      <div className="report-station">
        <BrandBadge brand={r.s.b} size={46} />
        <div><b>{stationName(r.s)}</b><small>{stationWhere(r.s)}</small></div>
        <p><small>{FUEL_LABEL[j.fuel]}</small><span className="price-pill">{fmtPrice(r.price)}<small>¢/L</small></span></p>
      </div>
      <p>Chaque station déclare elle-même ses prix à la Régie de l’énergie. Jauge les affiche tels quels.</p>
      <a className="go-button" href="https://regieessencequebec.ca" target="_blank" rel="noreferrer"><IconFlag />Signaler à la Régie</a>
    </div>
  )
}
