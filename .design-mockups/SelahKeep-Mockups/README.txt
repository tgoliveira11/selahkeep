SelahKeep — High-fidelity mockups
=================================
Direction: "Stillness" (Schibsted Grotesk) on SelahKeep's purple brand.
Every screen captured in mobile (390px) + desktop (~1280px), light + dark, all states.

0-Visual-signature/
  two-directions.png ............ The two explored visual signatures (Sanctuary vs Stillness)

1-Notes-list/   (the unlocked home of the app)
  {mobile,desktop}-{light,dark}-default ... pinned-first grouping, filter chips, counter, Vault Dock
  ...-empty ...................... calm empty state
  ...-loading .................... skeleton state
  ...-error ...................... "couldn't reach your vault" (data still safe)
  ...-locked ..................... vault locked overlay / unlock ritual
  {light}-vault-dock ............. expanded Vault Status Dock (countdown, stay-unlocked, lock now)

2-Note-editor/   (/notes/new — markdown editor + on-device Dictate)
  ...-ready ...................... Dictate model loaded (green ready indicator)
  ...-loading .................... model download % indicator
  ...-recording .................. live waveform + near-real-time transcript
  ...-review ..................... edit-before-insert step ("nothing left your device")

3-Note-detail/   (/notes/:id)
  ...-reading .................... long-form rendered markdown, metadata, lifecycle actions, timeline
  ...-version-history ............ GitHub-style compare + line-level diff (calm green/red)
  ...-version-list (mobile) ...... version list with Restore
  ...-zen ........................ focused reading mode

The live, clickable prototype is SelahKeep.dc.html (open in any browser; use the
top control bar to switch screen / device / theme / state).
