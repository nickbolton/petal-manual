const chapters = [
  {
    "id": "overview",
    "title": "Meet Petal",
    "group": "The basics",
    "kicker": "A GOOD PLACE TO BEGIN",
    "headline": "Less tap dancing.<br><em>More music.</em>",
    "intro": "A field guide to turning your MIDI rig into a performance that moves with your music. Build the changes once. Be present when they happen.",
    "tags": [
      "User manual",
      "iPhone + iPad",
      "Start here"
    ],
    "sections": [
      {
        "id": "the-idea",
        "title": "Your performance, connected.",
        "html": "<p>Petal is an iOS app for organizing MIDI devices, reusable sounds, song timelines, and performances. A compatible connected controller handles the MIDI side of your rig while Petal gives you a musical view of what happens next.</p><div class=\"flow\"><span>Devices</span><b>→</b><span>Presets & patches</span><b>→</b><span>Songs</span><b>→</b><span>Performances</span></div><p>Think of a <strong>preset</strong> as a saved instruction for one device, a <strong>patch</strong> as a group of presets, and a <strong>song</strong> as a timeline of changes. A <strong>performance</strong> puts songs in the order you want to play them.</p>"
      },
      {
        "id": "four-tabs",
        "title": "Four tabs. One connected rig.",
        "html": "<div class=\"feature-grid\"><a class=\"feature-card\" href=\"#songs\"><div class=\"card-top\"><span class=\"card-icon\">♫</span><span class=\"arrow\">↗</span></div><h3>Songs</h3><p>Your library of songs, musical structure, and timed changes.</p></a><a class=\"feature-card\" href=\"#performances\"><div class=\"card-top\"><span class=\"card-icon\">☷</span><span class=\"arrow\">↗</span></div><h3>Performances</h3><p>Arrange your songs into the order the night calls for.</p></a><a class=\"feature-card\" href=\"#devices\"><div class=\"card-top\"><span class=\"card-icon\">▣</span><span class=\"arrow\">↗</span></div><h3>Devices</h3><p>Set up your gear, MIDI channels, colors, controls, and presets.</p></a><a class=\"feature-card\" href=\"#patches\"><div class=\"card-top\"><span class=\"card-icon\">≋</span><span class=\"arrow\">↗</span></div><h3>Patches</h3><p>Bundle presets into reusable changes across your rig.</p></a></div>"
      },
      {
        "id": "choose-a-path",
        "title": "Find your starting point.",
        "html": "<p>New rig? Follow <a href=\"#quick-start\">Your first performance</a>. Already have sounds saved? Jump to <a href=\"#timeline\">the timeline</a>. At rehearsal with something not responding? Open <a href=\"#troubleshooting\">Troubleshooting</a>.</p><div class=\"note\"><strong>About this guide</strong><p>This manual follows the current development version of Petal, reviewed in October 2026. Interface diagrams are illustrations; labels and behavior can change between app and firmware releases.</p></div>"
      }
    ]
  },
  {
    "id": "quick-start",
    "title": "Your first performance",
    "group": "The basics",
    "kicker": "QUICK START",
    "headline": "From a blank canvas<br>to <em>your first cue.</em>",
    "intro": "Start small: one device, one saved preset, one song. Get that working before building your whole show.",
    "tags": [
      "6 steps",
      "Rehearsal first"
    ],
    "sections": [
      {
        "id": "first-run",
        "title": "A simple setup, step by step.",
        "html": "<ol class=\"step-list\"><li><strong>Sign in to Petal</strong><p>Choose Apple, phone, or Google on the welcome screen. Complete the provider’s sign-in flow. Sign-in is portrait; the authenticated app switches to landscape.</p></li><li><strong>Connect your controller</strong><p>Connect a supported USB MIDI device, or follow the Bluetooth pairing screen. Confirm the app shows a connected device before testing MIDI.</p></li><li><strong>Add one piece of gear</strong><p>Open Devices, tap +, and choose or create a device. Set its MIDI channel to match the receiving gear, then save.</p></li><li><strong>Save a preset</strong><p>Open that device’s Presets and create a preset with a simple MIDI message. Verify the receiving device responds.</p></li><li><strong>Create a song</strong><p>In Songs, tap +. Give the song a name, tempo, and time signature. Build its sections and place a preset event on the timeline.</p></li><li><strong>Make a performance</strong><p>In Performances, tap + and choose Empty or All Songs. Add your song, open it, and use Play to rehearse the cue.</p></li></ol>"
      },
      {
        "id": "check-before-play",
        "title": "Before you press Play.",
        "html": "<p>Check three things: <strong>connection</strong>, <strong>receiving channel</strong>, and <strong>saved changes</strong>. Keep your test message simple enough that you can hear or see the result immediately.</p><div class=\"note warning\"><strong>Loading can change your rig</strong><p>Events at the beginning of a song can be applied when the program loads. Treat selecting or loading a song as a meaningful action, and rehearse how it affects connected gear.</p></div>"
      },
      {
        "id": "next-step",
        "title": "Build up in layers.",
        "html": "<p>Once one cue works, add a second device or create a <a href=\"#patches\">patch</a> that combines several presets. Then add timed changes, ramps, and the rest of your performance order. Save and rehearse each layer before moving on.</p>"
      }
    ]
  },
  {
    "id": "connection",
    "title": "Connect your rig",
    "group": "The basics",
    "kicker": "CONNECTIONS",
    "headline": "Get connected.<br><em>Stay in control.</em>",
    "intro": "Petal supports compatible MIDI controllers over USB or Bluetooth. The connected controller bridges your song program to your MIDI gear.",
    "tags": [
      "USB MIDI",
      "Bluetooth MIDI"
    ],
    "sections": [
      {
        "id": "usb",
        "title": "Connect with USB.",
        "html": "<ol><li>Connect your supported controller to the iPhone or iPad using the appropriate USB cable or adapter.</li><li>Open Petal and allow it to discover and verify the device.</li><li>Check the connection indicator before loading or playing a song.</li></ol><p>A cable that supplies power does not necessarily carry data. If the device is missing, test a known data-capable cable and any adapter or hub separately.</p>"
      },
      {
        "id": "bluetooth",
        "title": "Pair over Bluetooth.",
        "html": "<ol><li>Enable Bluetooth and grant Petal Bluetooth permission.</li><li>Put the compatible controller in its normal advertising state and keep it close to your iOS device.</li><li>Follow Petal’s pairing screen and select the intended nearby device.</li><li>Wait for the connection to finish verifying.</li></ol><p>Petal remembers the paired device. To choose another one, open Settings and use <strong>Unpair &lt;device name&gt;</strong>, then follow pairing again.</p>"
      },
      {
        "id": "midi-path",
        "title": "Separate the two MIDI channels.",
        "html": "<p>Your rig has two different channel choices. A <strong>device’s MIDI channel</strong> targets the gear receiving its preset messages. Petal’s <strong>Incoming MIDI channel</strong> is for external performance commands arriving at the controller.</p><div class=\"flow\"><span>External controller</span><b>→</b><span>Petal incoming channel</span><b>→</b><span>Song playback</span></div><div class=\"flow\"><span>Song event</span><b>→</b><span>Device’s MIDI channel</span><b>→</b><span>Your gear</span></div><p>Changing one does not automatically change the other. See the <a href=\"#midi\">MIDI reference</a> for performance command values.</p>"
      },
      {
        "id": "transport-changes",
        "title": "When the connection changes.",
        "html": "<p>Petal synchronizes playback timing with the connected device when the active transport changes and refreshes the clock mapping periodically. Let the new connection settle before starting your next test. Timing compensation is automatic; there is no global event-delay setting to tune.</p><p>After switching cables or transports, verify one known cue before continuing your rehearsal or show.</p>"
      }
    ]
  },
  {
    "id": "devices",
    "title": "Devices & presets",
    "group": "Build your rig",
    "kicker": "YOUR GEAR, ORGANIZED",
    "headline": "Give every device<br><em>a clear identity.</em>",
    "intro": "Devices hold the details your MIDI messages need: channel, controls, colors, and saved presets.",
    "tags": [
      "Channels",
      "Controls",
      "Reusable sounds"
    ],
    "sections": [
      {
        "id": "add-device",
        "title": "Add and configure a device.",
        "html": "<ol><li>Open the <strong>Devices</strong> tab and tap <strong>+</strong>.</li><li>Select the available brand and device, or use the custom-device option for gear you define yourself.</li><li>Set the MIDI channel to match the receiving hardware.</li><li>Choose background and text colors that you can recognize quickly.</li><li>Tap <strong>Save</strong> to commit the configuration.</li></ol><p>A custom device lets you enter its name and brand. Device definitions can provide existing control information; you can also define controls in the device editor.</p>"
      },
      {
        "id": "presets",
        "title": "Create reusable presets.",
        "html": "<p>Open a device’s <strong>Presets</strong> and add a preset. Give it a useful name, then add the MIDI messages required for that sound or state. The MIDI editor exposes the message type and the relevant control, program, bank, value, or parameter fields.</p><p>Keep preset names musical: “Clean”, “Wide delay”, or “Solo” is easier to scan during rehearsal than a hardware-specific number. Confirm the numbers and channel against your receiving device’s documentation.</p>"
      },
      {
        "id": "controls",
        "title": "Define controls for your gear.",
        "html": "<p>The <strong>Controls</strong> area names MIDI CC controls for the device. A control combines a recognizable name with its control number. These definitions make preset editing and ramp selection easier to understand.</p><p>Use your hardware’s MIDI implementation chart to find the correct CC and value range. Different devices can assign completely different meanings to the same CC number.</p>"
      },
      {
        "id": "save-device",
        "title": "Save before leaving.",
        "html": "<p>Color selections and other edits in Edit Device are not committed until you save. Leaving a dirty editor through Back or swipe-back prompts you to <strong>Save</strong>, <strong>Leave</strong>, or <strong>Cancel</strong>. Save commits the changes; Leave discards them; Cancel keeps editing.</p><div class=\"note\"><strong>Why does a patch dot have the old color?</strong><p>Patch dots use the device’s saved background color. Change the color in Devices, then tap Save. A dark gray device can produce a dot that blends into the platter.</p></div>"
      }
    ]
  },
  {
    "id": "patches",
    "title": "Build a patch",
    "group": "Build your rig",
    "kicker": "ONE CHANGE, MANY DEVICES",
    "headline": "Your whole rig.<br><em>One musical idea.</em>",
    "intro": "A patch groups saved device presets so you can reuse the same combination in different songs.",
    "tags": [
      "Preset combinations",
      "Color-coded"
    ],
    "sections": [
      {
        "id": "create-patch",
        "title": "Create a patch.",
        "html": "<ol><li>Open <strong>Patches</strong> and tap <strong>+</strong>.</li><li>Give the patch a name.</li><li>Add the device presets you want it to include.</li><li>Save the patch, then use it as a reusable event in a song.</li></ol><p>For example, an illustrative “Wide chorus” patch might combine a modulation preset on one device with a delay preset on another. The patch stores the preset references; configure the actual MIDI messages in the presets.</p>"
      },
      {
        "id": "read-patch",
        "title": "Read the patch platters.",
        "html": "<p>Each platter shows the <strong>patch name</strong> and colored dots representing its presets. Each dot uses the referenced preset’s device background color. Up to ten dots are shown in two rows of five.</p><p>Patches are alphabetically sorted. Tap one to edit it. Its context menu offers <strong>Duplicate</strong>, <strong>Send To</strong>, and <strong>Delete</strong>.</p>"
      },
      {
        "id": "patch-or-preset",
        "title": "When to use a patch.",
        "html": "<div class=\"table-wrap\"><table><thead><tr><th>Choose</th><th>When you need</th></tr></thead><tbody><tr><td>Device preset</td><td>A saved instruction or collection of messages for one device.</td></tr><tr><td>Patch</td><td>A reusable combination of device presets across your rig.</td></tr><tr><td>Timeline event</td><td>A preset or patch change at a particular musical position.</td></tr></tbody></table></div><p>Start with a few well-tested presets. Build patches from those pieces, rather than copying the same MIDI instructions into many songs.</p>"
      }
    ]
  },
  {
    "id": "songs",
    "title": "Create a song",
    "group": "Write your cues",
    "kicker": "THE SONG LIBRARY",
    "headline": "A structure for<br><em>every change.</em>",
    "intro": "A song combines musical timing with the events your rig should perform. Set the foundation before filling in the timeline.",
    "tags": [
      "Tempo",
      "Time signature",
      "Song structure"
    ],
    "sections": [
      {
        "id": "song-details",
        "title": "Set the song’s timing.",
        "html": "<p>In <strong>Songs</strong>, tap <strong>+</strong> to create a song. Set its <strong>name</strong>, <strong>tempo</strong>, and <strong>time signature</strong>, then build the song structure.</p><p>Tempo determines the relationship between beats and elapsed time. The time signature helps organize the timeline into measures and beats. Get both right before rehearsing timed MIDI changes.</p>"
      },
      {
        "id": "song-structure",
        "title": "Build sections you can recognize.",
        "html": "<p>Use sections to divide the song into meaningful parts, such as an intro, verse, chorus, and bridge. Set each section’s musical length and use colors to make the structure easy to scan.</p><p>Keep the structure close to what you actually play. Section boundaries are also useful navigation points when rehearsing with previous/next section commands.</p><div class=\"note\"><strong>Changing the foundation</strong><p>Some song edits can prompt you to reset the structure. Read that prompt before confirming, particularly after you have placed events.</p></div>"
      },
      {
        "id": "entry-exit",
        "title": "Prepare the beginning and end.",
        "html": "<p>The song editor includes start and stop event areas. Use them to define the changes you need when entering or stopping a song. Presets and patches let you reuse these changes instead of rebuilding MIDI messages.</p><p>Events at the beginning of the song can fire during program loading. Test how choosing a song prepares your rig, as well as how it behaves when you press Play or Stop.</p>"
      },
      {
        "id": "manage-songs",
        "title": "Manage the library.",
        "html": "<p>The Songs list is alphabetically sorted. Use <strong>Edit</strong> to show trash buttons; the add button is hidden while editing. Deleting a library song asks for confirmation and includes Cancel.</p><p>Removing a song from a performance is different: that removes its place in that performance, not the underlying song from your library.</p>"
      }
    ]
  },
  {
    "id": "timeline",
    "title": "Events & ramps",
    "group": "Write your cues",
    "kicker": "THE MUSICAL TIMELINE",
    "headline": "Put the right change<br><em>on the right beat.</em>",
    "intro": "The timeline is where saved sounds become a performance: place discrete changes, shape continuous ones, and rehearse the result.",
    "tags": [
      "Musical positions",
      "Preset events",
      "Continuous control"
    ],
    "sections": [
      {
        "id": "timeline-basics",
        "title": "Read the timeline.",
        "html": "<p>The playhead shows your current position against the song’s section and beat structure. Event markers represent discrete changes. Ramps represent a control changing over a span of time.</p><p>Use the timeline editor to work with sections, events, and ramps. Playback view and edit view have different jobs: rehearse in playback, then return to editing when you need to change the song.</p>"
      },
      {
        "id": "place-events",
        "title": "Place preset and patch events.",
        "html": "<p>Add a preset or patch event at the musical position where you want the change. Use a device preset for a single-device instruction, or a patch when the cue needs a combination of saved presets.</p><p>Rehearse the lead-in and the moments after the event. A cue can be sent at the intended position while the receiving hardware still takes time to switch sounds. Verify the audible result, not only the onscreen marker.</p>"
      },
      {
        "id": "ramps",
        "title": "Shape changes with ramps.",
        "html": "<p>A ramp changes a device control across a duration rather than sending a single fixed value. Choose the device and control, then configure the available range, duration, and curve settings.</p><p>Use a ramp for an illustrative gradual effect change, such as increasing a delay amount over a phrase. The receiving device must support the selected MIDI control and values.</p><div class=\"note\"><strong>No controls available?</strong><p>Define the device’s controls first. The ramp editor needs a control to target; a device name alone does not tell Petal which MIDI CC to change.</p></div>"
      },
      {
        "id": "rehearse-timeline",
        "title": "Test the transitions.",
        "html": "<ul><li>Play through the cue from an earlier position.</li><li>Pause and resume around the change.</li><li>Seek or navigate between sections and confirm the rig reaches the expected state.</li><li>Try the same song again after loading a different song.</li></ul><p>Event notifications produce a ripple on the timeline. Use the visual feedback as a cue that an event was reported, then listen to the connected hardware to confirm the actual result.</p>"
      }
    ]
  },
  {
    "id": "performances",
    "title": "Arrange a performance",
    "group": "Take the stage",
    "kicker": "YOUR RUNNING ORDER",
    "headline": "Make the set<br><em>feel effortless.</em>",
    "intro": "A performance brings songs together in a deliberate order, while the song library remains your source material.",
    "tags": [
      "Running order",
      "Drag to reorder"
    ],
    "sections": [
      {
        "id": "new-performance",
        "title": "Create your running order.",
        "html": "<ol><li>Open <strong>Performances</strong> and tap <strong>+</strong>.</li><li>Choose <strong>All Songs</strong> to begin with the library, or <strong>Empty</strong> to build a focused list.</li><li>Open the performance’s song list and use <strong>+</strong> to add songs.</li><li>Touch and hold a row to drag it into the intended order.</li><li>Tap a song to open the performance screen.</li></ol><p>The performance platters use default app colors. Their menus provide editing, duplication, and deletion actions.</p>"
      },
      {
        "id": "reorder-remove",
        "title": "Reorder and remove songs.",
        "html": "<p>The row’s hamburger handle indicates reordering. Dragging remains enabled in edit mode, and the handle stays visible beside the trash button. Use <strong>Edit</strong> to expose removal controls and <strong>Done</strong> when finished.</p><p>Removing from this list does not delete the song from the library, and does not ask for a deletion confirmation. The Songs tab is where library deletion is managed.</p>"
      },
      {
        "id": "performance-settings",
        "title": "Song settings for a performance.",
        "html": "<p>The performance screen provides a settings action for the current performance song’s events, as well as a timeline edit action. Use those controls to inspect the song’s performance context and the underlying timeline.</p><p>Rehearse the actual running order. Loading one song after another can expose a missing preparation cue that would not be obvious when testing a song by itself.</p>"
      }
    ]
  },
  {
    "id": "playback",
    "title": "Run the show",
    "group": "Take the stage",
    "kicker": "PERFORMANCE MODE",
    "headline": "Eyes on the music.<br><em>Hands on your instrument.</em>",
    "intro": "Load the intended song, verify your connection, and use the transport controls to rehearse the same way you will perform.",
    "tags": [
      "Transport",
      "Guided Access",
      "Pre-show check"
    ],
    "sections": [
      {
        "id": "transport",
        "title": "Use the transport.",
        "html": "<div class=\"table-wrap\"><table><thead><tr><th>Control</th><th>Behavior</th></tr></thead><tbody><tr><td>Play</td><td>Starts playback; the button then acts as Pause.</td></tr><tr><td>Pause</td><td>Pauses the song so you can resume.</td></tr><tr><td>Stop</td><td>Stops playback and applies the configured stop behavior.</td></tr><tr><td>Previous / next song</td><td>Moves through the current performance.</td></tr><tr><td>Previous / next section</td><td>Navigates the song’s section structure.</td></tr></tbody></table></div><p>The playhead and event ripples help you follow the timeline. Keep the receiving hardware in your rehearsal loop: MIDI delivery and a device’s audible response are different parts of the chain.</p>"
      },
      {
        "id": "guided-access",
        "title": "Keep Petal on screen.",
        "html": "<p><strong>Require Guided Access</strong> is enabled by default. When you open a performance without an active Guided Access session, Petal shows instructions.</p><ol><li>In iOS Settings, go to <strong>Accessibility → Guided Access</strong> and enable it if needed.</li><li>Return to Petal and open your performance.</li><li>Triple-click the device’s side, top, or Home button, select Guided Access if prompted, then tap <strong>Start</strong>.</li></ol><p>Enabling the system setting and starting a Guided Access session are separate steps. Petal checks whether a session is active. Its Open Settings button opens Petal’s settings page; go back to the main Settings screen to reach Accessibility.</p>"
      },
      {
        "id": "show-check",
        "title": "A short pre-show check.",
        "html": "<ul><li>Open the intended account and performance.</li><li>Confirm the order of songs and the first song’s state.</li><li>Verify the controller connection and receiving device channels.</li><li>Test a known preset change and an external start command, if you use one.</li><li>Save edits, confirm power and cabling, and start Guided Access if required.</li></ul><div class=\"note\"><strong>Keep the app connected</strong><p>External Petal performance CC commands are routed through a connected Petal app. Do not assume those commands work with the app disconnected.</p></div>"
      }
    ]
  },
  {
    "id": "midi",
    "title": "MIDI control reference",
    "group": "Reference",
    "kicker": "HANDS-FREE CONTROL",
    "headline": "Small messages.<br><em>Big moves.</em>",
    "intro": "Use external MIDI CC messages to request playback and navigation through a compatible connected controller.",
    "tags": [
      "CC 101",
      "CC 102",
      "Channel 16 by default"
    ],
    "sections": [
      {
        "id": "command-table",
        "title": "Performance command table.",
        "html": "<p>Send these on the song program’s listening channel, initially <strong>channel 16</strong>. Set Petal’s Incoming MIDI channel to suit your controller. These commands are implemented by Petal-compatible firmware; verify your device’s firmware support.</p><div class=\"table-wrap\"><table><thead><tr><th>Action</th><th>CC</th><th>Value</th></tr></thead><tbody><tr><td>Play</td><td>101</td><td>3</td></tr><tr><td>Pause</td><td>101</td><td>4</td></tr><tr><td>Stop</td><td>101</td><td>5</td></tr><tr><td>Previous section</td><td>101</td><td>6</td></tr><tr><td>Next section</td><td>101</td><td>7</td></tr><tr><td>Go to song</td><td>102</td><td>Song position, 0–127</td></tr></tbody></table></div>"
      },
      {
        "id": "song-index",
        "title": "Song positions start at zero.",
        "html": "<p>For CC 102, value <strong>0</strong> selects the first song in the performance, value <strong>1</strong> the second, and so on. This is a position in the running order, not a song’s name or library identifier.</p><div class=\"note\"><strong>Example</strong><p>To request the third song, send CC 102 with value 2 on the configured incoming channel. Open the intended performance first.</p></div>"
      },
      {
        "id": "cc-route",
        "title": "How a footswitch starts playback.",
        "html": "<div class=\"flow\"><span>Footswitch CC</span><b>→</b><span>Connected controller</span><b>→</b><span>Petal app</span><b>→</b><span>Playback</span></div><p>The controller sends a request back to the app, which performs navigation and playback. These CCs do not directly start playback without an app connection. Previous and next song are not assigned additional CC 101 values in the current implementation; use CC 102 to choose a song by position.</p><p>Control Change numbers and values are 7-bit MIDI data: <strong>0–127</strong>. Device-specific preset controls are separate from this Petal performance command table.</p>"
      }
    ]
  },
  {
    "id": "settings",
    "title": "Settings & your account",
    "group": "Reference",
    "kicker": "MAKE PETAL YOURS",
    "headline": "A few settings.<br><em>A familiar setup.</em>",
    "intro": "Open Settings from the app’s gear button. Device configuration and account actions have different effects.",
    "tags": [
      "Account",
      "Pairing",
      "Preferences"
    ],
    "sections": [
      {
        "id": "settings-table",
        "title": "The Settings platters.",
        "html": "<div class=\"table-wrap\"><table><thead><tr><th>Setting</th><th>What it controls</th></tr></thead><tbody><tr><td>Incoming MIDI channel</td><td>The channel for incoming Petal performance commands. Default: 16.</td></tr><tr><td>Require Guided Access</td><td>Shows a warning when opening a performance without an active session. Default: on.</td></tr><tr><td>Unpair &lt;device name&gt;</td><td>Clears the saved device pairing so you can pair again. Appears only when a device is paired.</td></tr><tr><td>Sign Out</td><td>Ends the current account session after confirmation.</td></tr></tbody></table></div><p>Tap a boolean setting’s switch or its platter to change it. Incoming MIDI channel offers a channel selection menu.</p>"
      },
      {
        "id": "sign-out",
        "title": "Sign out or switch accounts.",
        "html": "<p>Choose <strong>Sign Out</strong>, check the account shown in the confirmation, and confirm. Petal clears the account session and local member cache, stops its active MIDI connection, and returns to the portrait sign-in screen.</p><p>App preferences and saved pairing remain in place. Sign Out does not delete the Firebase account or its server-side documents. Sign into another account to load that account’s songs, performances, devices, and patches.</p>"
      },
      {
        "id": "unpair",
        "title": "Unpair without signing out.",
        "html": "<p>Choose <strong>Unpair &lt;device name&gt;</strong> to forget the saved pairing. You remain signed in. Follow the pairing flow to select the intended compatible device again.</p><p>Use Unpair for changing hardware. Use Sign Out for changing accounts. Neither action is a replacement for intentionally stopping a performance.</p>"
      }
    ]
  },
  {
    "id": "troubleshooting",
    "title": "Troubleshooting",
    "group": "Reference",
    "kicker": "BACK TO THE MUSIC",
    "headline": "A clear path<br><em>through the noise.</em>",
    "intro": "Start with the smallest known-working cue, then check one link in the chain at a time.",
    "tags": [
      "Known checks",
      "Practical fixes"
    ],
    "sections": [
      {
        "id": "common-issues",
        "title": "Quick answers.",
        "html": "<details open><summary>The patch dot looks clear or has the wrong color.</summary><p>Open its referenced device in Devices, choose the intended background color, and tap Save. The dot uses the saved device color; dark gray can blend into the platter. Also confirm the patch includes the preset for the device you meant to use.</p></details><details><summary>My controller does not appear over USB.</summary><p>Try a known data-capable cable, check adapters and hubs, and make sure the controller is powered and running compatible firmware. Reconnect and let Petal finish discovery and verification.</p></details><details><summary>I cannot pair over Bluetooth.</summary><p>Enable Bluetooth, allow Petal access, and move the intended controller close. If a different device is remembered, use Unpair in Settings and try pairing again. Check that the controller is advertising normally.</p></details><details><summary>The connection works, but my gear does not respond.</summary><p>Compare the receiving device’s channel with its channel in Petal. Then verify the message type, CC or program number, and value against the hardware’s MIDI chart. Test one simple preset before testing a patch or song.</p></details><details><summary>My footswitch does not start the song.</summary><p>Open the intended performance and verify the app is connected. Send CC 101, value 3 on the configured Incoming MIDI channel. Do not confuse that channel with a receiving device’s MIDI channel.</p></details><details><summary>Guided Access is enabled, but Petal still warns me.</summary><p>The system setting enables the feature; it does not start a session. Return to Petal, triple-click the side, top, or Home button, select Guided Access if needed, and tap Start.</p></details><details><summary>A large song will not load.</summary><p>App and firmware versions can impose message-frame and song-storage limits. Keep the error message, note which song failed, and verify both app and controller firmware versions. Do not assume a large payload is automatically split into accepted song programs.</p></details><details><summary>Sign-in stays portrait. Is that expected?</summary><p>Yes. The sign-in flow uses portrait. Petal switches to landscape for the authenticated app and restores portrait when you sign out.</p></details>"
      },
      {
        "id": "isolate",
        "title": "Isolate the problem in this order.",
        "html": "<ol><li><strong>Connection:</strong> Does Petal report the intended controller?</li><li><strong>Device:</strong> Can a single preset change your receiving hardware?</li><li><strong>Patch:</strong> Do its referenced presets produce the intended combination?</li><li><strong>Song:</strong> Does the event work at the intended position?</li><li><strong>Performance:</strong> Does it work after the previous song in the actual running order?</li></ol><p>When reporting an issue, include your app and firmware versions, transport, the failing action, the expected result, and the full error text. Reproduction steps are more useful than changing several settings at once.</p>"
      },
      {
        "id": "glossary",
        "title": "A small musical glossary.",
        "html": "<div class=\"table-wrap\"><table><thead><tr><th>Term</th><th>Meaning in Petal</th></tr></thead><tbody><tr><td>Device</td><td>A configured piece of MIDI gear, including its channel and controls.</td></tr><tr><td>Preset</td><td>A saved set of MIDI messages for one device.</td></tr><tr><td>Patch</td><td>A reusable group of device presets.</td></tr><tr><td>Event</td><td>A discrete change placed at a musical position.</td></tr><tr><td>Ramp</td><td>A control change spread across a duration.</td></tr><tr><td>Section</td><td>A named part of a song’s musical structure.</td></tr><tr><td>Performance</td><td>An ordered collection of songs for playback.</td></tr><tr><td>Transport</td><td>USB or Bluetooth connection; also the Play/Pause/Stop controls, depending on context.</td></tr></tbody></table></div>"
      }
    ]
  }
];
