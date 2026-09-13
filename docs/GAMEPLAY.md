# DebtQuest game loop

The Quest screen leads with Freedom Isles and Pip, an original companion. Financial records remain in Debts. A game milestone measures participation; it never claims that a user has paid off debt. The real payoff total stays visible below the map.

## Earned actions

| Action                         | Reward            | Limit                                                             |
| ------------------------------ | ----------------- | ----------------------------------------------------------------- |
| Check in                       | 25 XP             | Once per local calendar day                                       |
| Record an already-made payment | 50 XP             | First record for each payment date, regardless of amount          |
| Encourage a circle win         | 15 XP             | Once per local calendar day                                       |
| Open the consistency chest     | 40 XP, guaranteed | Check in on 3 distinct days Monday–Sunday; collect once that week |

Check-ins, encouragement, and the chest let players advance without making a payment. There are no random rewards, purchases, cash prizes, losses for missed days, or bonuses for paying larger amounts. XP is personal progress, not a competitive or financial asset. Payment entry continues to record money already paid outside the app.

## World and companion collection

| Lifetime XP | Island          | Companion look    |
| ----------- | --------------- | ----------------- |
| 0           | Starter Shore   | Pip               |
| 250         | Camp Courage    | Explorer scarf    |
| 750         | Sky Meadow      | Trailblazer cape  |
| 1,500       | Starlight Falls | Starlight lantern |
| 3,000       | Freedom Summit  | Summit crown      |

Map nodes open a preview of each unlock. Earned looks can be equipped free from Rewards or immediately after an unlock. Spending available XP on an experiential reward never reduces lifetime XP or relocks a look. The map remains explorable after the final island.

## Payment feedback

1. Validate and save the actual payment and statement balance through the existing storage path.
2. Derive the celebration from the before/after saved records. No animation awards points or modifies money.
3. Animate the remaining balance, show Pip celebrating, reveal earned XP, then show any newly earned badges or companion look.
4. Use a larger payoff celebration only when the saved account balance is zero. If a statement adjustment raises the balance, show “Payment recorded” and the real increase rather than claiming debt was cleared.
5. Offer the optional circle link after a shared win. A failed social post does not undo the payment; the dialog explains how to retry. A failed payment save leaves the form open and shows no celebration.

Animations are brief and can be skipped. System reduced motion displays the final state immediately. Optional synthesized success sounds default off and use a preference saved on the current device. Native success haptics use the existing Capacitor integration; real-device feel still needs iPhone testing.

## Preview and persistence

The fictional `/?demo=1` experience includes **Try a payment celebration**, with Payment, Level up, and Debt cleared scenes. These previews never write debt or progression records. They are labeled as samples, and equipping an item is unavailable within a sample celebration.

Real chest claims and companion selection are saved in the existing journey payload and included in backups. Old payloads receive empty chest history and the starter companion. Imported game fields are validated; claiming a saved weekly chest twice or equipping an unearned look is rejected. Existing cloud version checks prevent stale sessions from replacing newer data.

No new analytics SDK, notification permission, bank connection, or backend table is introduced. Connected circles still require the deployment and acceptance checks in [SOCIAL.md](SOCIAL.md).
