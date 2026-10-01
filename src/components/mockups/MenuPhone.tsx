import React from "react"

export function MenuPhone() {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone-top">
        <span>9:41</span>
        <i />
      </div>
      <div className="food-photo">
        <div className="plate">
          <span>FEN</span>
        </div>
      </div>
      <div className="phone-copy">
        <small>CHEF’S SPECIAL</small>
        <b>Roasted herb bowl</b>
        <p>Seasonal vegetables, labneh, za’atar oil</p>
        <div className="price">
          <strong>7.50 JD</strong>
          <span>＋</span>
        </div>
      </div>
    </div>
  )
}
