# Volleyball Premier League Auction Portal — Implementation Status

## ✅ COMPLETED (Code Ready)

The portal has been fully rebuilt to match your exact rules:

### 1. Team Owners & ₹500 Wallet System
- **Registered Team Owners** (with logos from the VPL2 folder):

| Team Name | Owner | Logo File |
|---|---|---|
| 7 Deadly Zins | Saish Kedari | `7 Deadly Zins.jpeg` |
| Black Jackals | Yash Shinde | `Black Jackals.jpeg` |
| RKD Warriors | Abhishek Achrekar | `RKD Warriors.jpeg` |
| Thunder Hawks | Adesh Durafe | `Thunder Hawks.jpeg` |
| Shivaay Spikers | Harshad Natekar | — |

- All 5 owner slots are now filled.
- **Strict ₹500 purse**: every owner starts with ₹500. If the final sold price exceeds the owner's remaining purse, the sale is **BLOCKED** with a warning.
- Logos load automatically from the project folder (e.g. `7 Deadly Zins.jpeg`), with a volleyball-icon fallback if missing.

### 2. Official Players List (38 Players) ✅ Added
The following 38 players are pre-loaded into the app as the default auction list:

1. Parth Wavhal
2. Rushab Pendurkar
3. Vijay Karande
4. Sujal Kaspale
5. Ritesh Chavan
6. Sahil Gharkar
7. Yug Sanil
8. Sarthak Khapre
9. Krishna Karande
10. Shantanu Rajeshirke
11. Saurabh Rajeshirke
12. Swayam Rajeshirke
13. Nilu Sonar
14. Prasad Natekar
15. Ganesh Waikar
16. Pratik Marathe
17. Aryan Shinde
18. Nitin Utekar
19. Soham Dongre
20. Shivansh Patil
21. Sachin Vichare
22. Manmohan Konde
23. Gopal Koyande
24. Vinayak Utekar
25. Ashish Chavan
26. Shubham Achrekar
27. Amey Bhatkar
28. Akshay Shimpi
29. Shyam More
30. Nikhil Shendge
31. Shivam Sonawane
32. Pranav Kadam
33. Krishna Yadav
34. Abhijeet Kadam
35. Aryan Kadam
36. Atharva Kokane
37. Sarthak Kedari
38. Ruturaj Shigvan

### 3. Physical Auction Workflow
- Only the **Player Name** is shown in the giant spotlight (bidding is conducted physically in the room).
- Enter the **Final Sold Price (₹)** → click the **winning owner card** → press **MARK AS SOLD**.
- The amount is deducted from the owner's wallet and the remaining purse is displayed live.
- **MARK AS UNSOLD** flags the player for the second-chance round.

### 4. Round System (No Repeats, Up to 4 Rounds)
- **Round 1 (Main Draw)**: randomly draws from ALL 38 registered players — **no player repeats** until the list is exhausted.
- **Rounds 2–4 (Unsold Second Chance)**: after each round, players marked UNSOLD are automatically carried into the next round and randomly re-auctioned. This continues up to **Round 4**.
- If a player remains unsold after Round 4, the auction ends and they are recorded as unsold.
- A phase banner shows which round is live and the progress count.

### 5. Roster Dashboard & PDF Report
- Team cards show **Logo, Team Name, Owner Name, Remaining Purse (₹), Spent Amount**, and the acquired players list.
- **PDF Report** with ₹ formatting, team owner rosters, purse balances, sold & unsold player lists.

---

## How to modify owners (if needed):
- Go to **5 Team Owners & Rosters** tab → click **Configure Owners & Logos**.
- Edit team names, owner names, and logo filenames → **Save Owner Details**.
</content>

