# TURN Server Migration: Metered.ca → Self-hosted coturn on Oracle Cloud

## Context

The project currently uses Metered.ca's free tier (500MB/month) as its TURN relay server for
WebRTC peer-to-peer fallback in the live class feature. This is a temporary solution. The
long-term plan is to self-host coturn on Oracle Cloud Always Free, which provides a permanent
free ARM VM with 10TB/month outbound bandwidth — far more than the Metered.ca limit.

Oracle Cloud requires a credit/debit card for identity verification even on the free tier.
This migration should be performed once that card is available.

The file that needs to be updated at the end of this migration is:

```
AbelBegena/client/.env.local
```

Specifically the `NEXT_PUBLIC_TURN_SERVERS` variable (a single JSON array on one line).

---

## Part 1 — Oracle Cloud Account Setup

1. Go to https://cloud.oracle.com and click **Start for free**.
2. Sign up with an email address, phone number, and credit/debit card (used for identity
   verification only — you will not be charged as long as you stay on Always Free resources).
3. When asked to pick a **Home Region**, choose the region geographically closest to your
   users. This choice is permanent and cannot be changed later. For users primarily in East
   Africa, the closest available Oracle regions are `eu-frankfurt-1` (Germany) or
   `me-jeddah-1` (Saudi Arabia). Pick whichever has lower latency to your users.
4. Complete account activation. This can take a few minutes to up to an hour.

---

## Part 2 — Create the Free ARM Virtual Machine

1. From the Oracle Cloud dashboard, open the main menu (☰) and go to
   **Compute → Instances → Create Instance**.

2. Set the following:
   - **Name:** `coturn-server` (or any name you prefer)
   - **Image:** Ubuntu 22.04 (click "Change Image" if it defaults to something else)
   - **Shape:** Click "Change Shape" → select **Ampere** → pick `VM.Standard.A1.Flex`
     - Set **OCPUs: 1**, **Memory: 6 GB**
     - This is the Always Free ARM shape. Do not pick any other shape.

3. Under **Add SSH Keys**, select **Generate a key pair for me** and download both the
   private key (`.key`) and public key (`.key.pub`) files. Save them somewhere safe —
   you need the private key to SSH into the server later.

4. Leave all networking settings at their defaults (a new VCN will be created automatically).

5. Click **Create**. The instance will take 1–2 minutes to provision. Wait until its status
   shows **Running**.

6. Note the instance's **Public IP Address** from the instance detail page. You will need
   this throughout the rest of the setup.

---

## Part 3 — Open the Required Ports (Oracle Security Rules)

Oracle Cloud blocks all inbound traffic by default. You need to open the ports that coturn
uses.

1. From the instance detail page, click the **VCN** link under "Primary VNIC".
2. Click **Security Lists** in the left sidebar, then click the default security list.
3. Click **Add Ingress Rules** and add the following rules one at a time:

   | Source CIDR | Protocol | Destination Port | Purpose |
   |---|---|---|---|
   | 0.0.0.0/0 | UDP | 3478 | TURN/STUN standard |
   | 0.0.0.0/0 | TCP | 3478 | TURN over TCP |
   | 0.0.0.0/0 | UDP | 5349 | TURN over TLS |
   | 0.0.0.0/0 | TCP | 5349 | TURN over TLS |
   | 0.0.0.0/0 | UDP | 49152-65535 | TURN relay port range |

4. Save each rule. All five must be present.

---

## Part 4 — SSH Into the VM

From your local machine (Windows), open PowerShell and run:

```powershell
ssh -i "C:\path\to\your-private-key.key" ubuntu@<YOUR_PUBLIC_IP>
```

Replace `<YOUR_PUBLIC_IP>` with the public IP noted in Part 2, and update the path to
wherever you saved the private key file.

If you get a permissions error on the key file, run:
```powershell
icacls "C:\path\to\your-private-key.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"
```

Accept the SSH fingerprint prompt by typing `yes`.

---

## Part 5 — Install coturn

Once logged into the VM, run the following commands:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y coturn
```

---

## Part 6 — Configure coturn

First, get the VM's private IP address:

```bash
hostname -I
```

Note the first IP in the output — this is your private IP.

Now edit the coturn configuration file:

```bash
sudo nano /etc/turnserver.conf
```

Replace the entire contents with the following, substituting the values marked with `<>`:

```
listening-port=3478
tls-listening-port=5349
listening-ip=<PRIVATE_IP>
external-ip=<PUBLIC_IP>
relay-ip=<PRIVATE_IP>
fingerprint
lt-cred-mech
user=abelbegena:<CHOOSE_A_STRONG_PASSWORD>
realm=abelbegena.com
log-file=/var/log/turnserver.log
min-port=49152
max-port=65535
```

- Replace `<PRIVATE_IP>` with the private IP from `hostname -I`
- Replace `<PUBLIC_IP>` with the public IP from the Oracle Cloud console
- Replace `<CHOOSE_A_STRONG_PASSWORD>` with a strong password you create (e.g. a random
  32-character string). Save this password — you will need it for the env var.

Save and exit: press `Ctrl+X`, then `Y`, then `Enter`.

Now enable coturn to run as a service:

```bash
sudo nano /etc/default/coturn
```

Find the line `#TURNSERVER_ENABLED=1` and remove the `#` so it reads:

```
TURNSERVER_ENABLED=1
```

Save and exit.

---

## Part 7 — Configure the OS Firewall

Oracle's Ubuntu VMs also have a local iptables firewall that needs the same ports opened:

```bash
sudo iptables -I INPUT -p udp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 3478 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 5349 -j ACCEPT
sudo iptables -I INPUT -p tcp --dport 5349 -j ACCEPT
sudo iptables -I INPUT -p udp --dport 49152:65535 -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

When prompted by `iptables-persistent`, answer **Yes** to save both IPv4 and IPv6 rules.

---

## Part 8 — Start coturn

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
sudo systemctl status coturn
```

The status output should show `active (running)`. If it shows `failed`, check the log:

```bash
sudo journalctl -u coturn -n 50
```

---

## Part 9 — Test the TURN Server

Before updating the project, verify the server is reachable using the Trickle ICE tool:

1. Open https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ in a browser.
2. Clear the default STUN/TURN entries.
3. Add a new server with:
   - **URI:** `turn:<YOUR_PUBLIC_IP>:3478`
   - **Username:** `abelbegena`
   - **Credential:** `<THE_PASSWORD_YOU_SET>`
4. Click **Gather candidates**.
5. You should see candidates of type `relay` appear in the output. If you only see `host`
   or `srflx` candidates and no `relay`, the server is not reachable — recheck Parts 3 and 7.

---

## Part 10 — Update the Project

Open the file `AbelBegena/client/.env.local` and replace the current value of
`NEXT_PUBLIC_TURN_SERVERS` with the following (all on one line):

```
NEXT_PUBLIC_TURN_SERVERS=[{"urls":"stun:<YOUR_PUBLIC_IP>:3478"},{"urls":"turn:<YOUR_PUBLIC_IP>:3478","username":"abelbegena","credential":"<YOUR_PASSWORD>"},{"urls":"turn:<YOUR_PUBLIC_IP>:3478?transport=tcp","username":"abelbegena","credential":"<YOUR_PASSWORD>"},{"urls":"turn:<YOUR_PUBLIC_IP>:5349","username":"abelbegena","credential":"<YOUR_PASSWORD>"}]
```

Replace `<YOUR_PUBLIC_IP>` and `<YOUR_PASSWORD>` with the actual values.

The final `.env.local` should look like this (with real values filled in):

```
NEXT_PUBLIC_API_URL=http://localhost:5001

NEXT_PUBLIC_TURN_SERVERS=[{"urls":"stun:1.2.3.4:3478"},{"urls":"turn:1.2.3.4:3478","username":"abelbegena","credential":"yourpassword"},{"urls":"turn:1.2.3.4:3478?transport=tcp","username":"abelbegena","credential":"yourpassword"},{"urls":"turn:1.2.3.4:5349","username":"abelbegena","credential":"yourpassword"}]
```

After saving, restart the Next.js dev server (or redeploy if in production) so the new env
var takes effect.

---

## Part 11 — Decommission Metered.ca (Optional)

Once the self-hosted server is tested and working:

1. Log into https://metered.ca and go to **TURN Server**.
2. Find the credential row (username `7379cc93173a3c220d1f7f1f`) and click **Remove**.
3. You can delete the `abelbegena` Metered app entirely if no other features from Metered
   are in use.

---

## Summary of What Changes

| Item | Before (Metered.ca) | After (Self-hosted) |
|---|---|---|
| TURN provider | metered.ca hosted | Oracle Cloud VM (always free) |
| Monthly bandwidth | 500MB cap | 10TB cap |
| Credentials | Metered-issued username/credential | `abelbegena` / your chosen password |
| TURN URLs | `*.relay.metered.ca` | Your Oracle VM public IP |
| File changed | `client/.env.local` | `client/.env.local` (same file) |
| Code changes | None | None |
