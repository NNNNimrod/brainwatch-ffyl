(function(ns) {
  // Timed FFYL lyric chart (audio.currentTime). Howto lines before verse 1.
  // Times from faster-whisper alignment (vad_filter=false).
  ns.LYRICS = [
    { t: 0, text: "LEFT / RIGHT — dodge the cybercabs", howto: true },
    { t: 4.02, text: "Avoid enemies · stay in your lane", howto: true },
    { t: 7.14, text: "GRAB life pickups — heal + firepower", howto: true },

    // Verse 1
    { t: 13.7, text: "She's got nothing to prove" },
    { t: 17.12, text: "and you've got the world to lose" },
    { t: 22, text: "Always on the move," },
    { t: 24.74, text: "killer's coming straight for you" },
    { t: 28.02, text: "This party's been crashed" },
    { t: 32.5, text: "bodies smashed" },
    { t: 33.86, text: "storm keeps rolling on" },
    { t: 36.66, text: "Only the strong ones" },

    // Holding on — brains howto + lyric
    { t: 38.25, text: "TAP brains to shoot · GLOW = switch lanes", howto: true },
    { t: 40.2, text: "with diamond hands are holding ooooooon" },
    { t: 42.54, text: "holding on" },
    { t: 46.54, text: "hold ooooooooooon" },

    // Chorus 1
    { t: 58.58, text: "I wanna know" },
    { t: 61.84, text: "how you're gonna" },
    { t: 63.82, text: "survive" },
    { t: 66.92, text: "blood on the streets" },
    { t: 69.82, text: "die on your knees" },
    { t: 72.5, text: "fight for your life" },
    { t: 81.82, text: "blood on the streets" },
    { t: 84.72, text: "die on your knees" },
    { t: 87.5, text: "fight for your life" },

    // Verse 2
    { t: 96.27, text: "She's out for herself" },
    { t: 98.94, text: "yeah she'll put you on the shelf" },
    { t: 103.44, text: "you'll make it to the end" },
    { t: 106.82, text: "if you've got the strength to fend" },
    { t: 110.42, text: "This show's at applause!" },
    { t: 114.46, text: "Dont get lost, You'll be found" },
    { t: 117.02, text: "Get your ass off the ground" },
    { t: 120.82, text: "Only the strong ones with diamond hands are holding on" },
    { t: 124.38, text: "hold on..." },

    // Chorus 2
    { t: 155.28, text: "I wanna know" },
    { t: 158.76, text: "how you're gonna" },
    { t: 160.62, text: "survive" },
    { t: 163.7, text: "blood on the streets" },
    { t: 166.58, text: "die on your knees" },
    { t: 169.28, text: "fight for your life" },
    { t: 178.56, text: "blood on the streets" },
    { t: 181.42, text: "die on your knees" },
    { t: 184.16, text: "fight for your life" },
    // t:188 gap intentionally blank (removed "c'mon — fight!")

    // Ending / karaoke — lyric lines only (art cards carry the same lines visually)
    { t: 193.22, text: "Protect your freedoms!", scrollUp: true },
    { t: 195.9, text: "You're gonna need them!", scrollUp: true },
    { t: 197.94, text: "You'd better fight for it!", scrollUp: true },
    { t: 201.02, text: "Don't hide in the dark!" },
    { t: 203.14, text: "Stand up, take heart!" },
    { t: 205, text: "It's time to fight, yeah!" },
    { t: 215.96, text: "You've got the power!" },
    { t: 217.9, text: "Scream from the tower!" },
    { t: 219.76, text: "Just fucking FIGHT" }
  ];
})(window.ApexRacer = window.ApexRacer || {});
