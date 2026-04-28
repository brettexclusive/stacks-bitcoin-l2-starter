(define-map claims principal
  {
    claimed-at: uint
  }
)

(define-constant err-already-claimed (err u100))

(define-public (claim)
  (begin
    (asserts! (is-none (map-get? claims tx-sender)) err-already-claimed)
    (map-set claims tx-sender { claimed-at: stacks-block-height })
    (ok true)
  )
)

(define-read-only (has-claimed (wallet principal))
  (is-some (map-get? claims wallet))
)

(define-read-only (get-claim (wallet principal))
  (map-get? claims wallet)
)
