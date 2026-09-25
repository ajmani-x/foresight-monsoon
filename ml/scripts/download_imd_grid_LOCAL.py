"""
RUN THIS ON YOUR OWN MACHINE (not in a cloud/CI environment) -- IMD's
gridded-data server blocks datacenter/cloud IPs, but should be reachable
from a normal Indian residential/institutional connection.

Downloads IMD's official 0.25-degree gridded daily rainfall data via
`imdlib` (the purpose-built Python package for this exact dataset) and
extracts the value at each of our 74 district centroids for every day in
the requested year range, producing ONE compact CSV instead of the raw
multi-GB gridded files.

Usage:
    pip install imdlib pandas xarray
    python3 download_imd_grid_LOCAL.py

Adjust START_YEAR / END_YEAR below depending on how much history you want
and how long you're willing to wait (each year is its own download).
IMD's gridded rainfall record goes back to 1901; 1990-2023 (34 years) is
a reasonable balance of history depth vs. download time/size for a
first pass -- extend it once this works.

Output: imd_district_rainfall.csv (send this file back for the pipeline)
"""

import imdlib
import pandas as pd

START_YEAR = 1990
END_YEAR = 2023
CACHE_DIR = "imd_grid_cache/"

DISTRICTS = [
    ("MH-PUN", "Pune", "Maharashtra", 18.5204, 73.8567),
    ("MH-NAS", "Nashik", "Maharashtra", 19.9975, 73.7898),
    ("MH-AUR", "Aurangabad", "Maharashtra", 19.8762, 75.3433),
    ("MH-NAG", "Nagpur", "Maharashtra", 21.1458, 79.0882),
    ("MH-AMR", "Amravati", "Maharashtra", 20.9374, 77.7796),
    ("MH-KOL", "Kolhapur", "Maharashtra", 16.705, 74.2433),
    ("MH-SOL", "Solapur", "Maharashtra", 17.6599, 75.9064),
    ("KA-BLR", "Bengaluru Rural", "Karnataka", 13.2846, 77.6947),
    ("KA-MYS", "Mysuru", "Karnataka", 12.2958, 76.6394),
    ("KA-BEL", "Belagavi", "Karnataka", 15.8497, 74.4977),
    ("KA-DHA", "Dharwad", "Karnataka", 15.4589, 75.0078),
    ("KA-RAI", "Raichur", "Karnataka", 16.2076, 77.3463),
    ("KA-KAL", "Kalaburagi", "Karnataka", 17.3297, 76.8343),
    ("TN-CHN", "Chennai", "Tamil Nadu", 13.0827, 80.2707),
    ("TN-CBE", "Coimbatore", "Tamil Nadu", 11.0168, 76.9558),
    ("TN-MDU", "Madurai", "Tamil Nadu", 9.9252, 78.1198),
    ("TN-TRZ", "Tiruchirappalli", "Tamil Nadu", 10.7905, 78.7047),
    ("TN-SLM", "Salem", "Tamil Nadu", 11.6643, 78.146),
    ("AP-VSK", "Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185),
    ("AP-GTR", "Guntur", "Andhra Pradesh", 16.3067, 80.4365),
    ("AP-KRN", "Kurnool", "Andhra Pradesh", 15.8281, 78.0373),
    ("TG-HYD", "Hyderabad", "Telangana", 17.385, 78.4867),
    ("TG-WGL", "Warangal", "Telangana", 17.9689, 79.5941),
    ("TG-NLG", "Nalgonda", "Telangana", 17.0575, 79.2673),
    ("KL-EKM", "Ernakulam", "Kerala", 9.9816, 76.2999),
    ("KL-PLK", "Palakkad", "Kerala", 10.7867, 76.6548),
    ("KL-WAY", "Wayanad", "Kerala", 11.6854, 76.132),
    ("GJ-AHM", "Ahmedabad", "Gujarat", 23.0225, 72.5714),
    ("GJ-SUR", "Surat", "Gujarat", 21.1702, 72.8311),
    ("GJ-RAJ", "Rajkot", "Gujarat", 22.3039, 70.8022),
    ("GJ-BNS", "Banaskantha", "Gujarat", 24.1719, 72.439),
    ("GJ-KUT", "Kutch", "Gujarat", 23.242, 69.6669),
    ("RJ-JAI", "Jaipur", "Rajasthan", 26.9124, 75.7873),
    ("RJ-JOD", "Jodhpur", "Rajasthan", 26.2389, 73.0243),
    ("RJ-KOT", "Kota", "Rajasthan", 25.2138, 75.8648),
    ("RJ-UDA", "Udaipur", "Rajasthan", 24.5854, 73.7125),
    ("RJ-GAN", "Ganganagar", "Rajasthan", 29.9038, 73.8772),
    ("MP-BPL", "Bhopal", "Madhya Pradesh", 23.2599, 77.4126),
    ("MP-IND", "Indore", "Madhya Pradesh", 22.7196, 75.8577),
    ("MP-JBP", "Jabalpur", "Madhya Pradesh", 23.1815, 79.9864),
    ("MP-GWL", "Gwalior", "Madhya Pradesh", 26.2183, 78.1828),
    ("MP-SAG", "Sagar", "Madhya Pradesh", 23.8388, 78.7378),
    ("UP-LKO", "Lucknow", "Uttar Pradesh", 26.8467, 80.9462),
    ("UP-KNP", "Kanpur", "Uttar Pradesh", 26.4499, 80.3319),
    ("UP-VNS", "Varanasi", "Uttar Pradesh", 25.3176, 82.9739),
    ("UP-AGR", "Agra", "Uttar Pradesh", 27.1767, 78.0081),
    ("UP-GKP", "Gorakhpur", "Uttar Pradesh", 26.7606, 83.3732),
    ("UP-MRT", "Meerut", "Uttar Pradesh", 28.9845, 77.7064),
    ("BR-PAT", "Patna", "Bihar", 25.5941, 85.1376),
    ("BR-GAY", "Gaya", "Bihar", 24.7955, 84.9994),
    ("BR-MUZ", "Muzaffarpur", "Bihar", 26.1225, 85.3906),
    ("BR-PUR", "Purnia", "Bihar", 25.7771, 87.4753),
    ("WB-KOL", "Kolkata", "West Bengal", 22.5726, 88.3639),
    ("WB-HOO", "Hooghly", "West Bengal", 22.9012, 88.3967),
    ("WB-BAR", "Bardhaman", "West Bengal", 23.2324, 87.8615),
    ("WB-MAL", "Malda", "West Bengal", 25.0108, 88.1411),
    ("OR-BBS", "Bhubaneswar", "Odisha", 20.2961, 85.8245),
    ("OR-CTC", "Cuttack", "Odisha", 20.4625, 85.8828),
    ("OR-KAL", "Kalahandi", "Odisha", 19.9139, 83.1653),
    ("JH-RAN", "Ranchi", "Jharkhand", 23.3441, 85.3096),
    ("JH-DHN", "Dhanbad", "Jharkhand", 23.7957, 86.4304),
    ("CG-RAI", "Raipur", "Chhattisgarh", 21.2514, 81.6296),
    ("CG-BIL", "Bilaspur", "Chhattisgarh", 22.0797, 82.1409),
    ("CG-BST", "Bastar", "Chhattisgarh", 19.1071, 81.955),
    ("PB-LUD", "Ludhiana", "Punjab", 30.901, 75.8573),
    ("PB-AMR", "Amritsar", "Punjab", 31.634, 74.8723),
    ("PB-BAT", "Bathinda", "Punjab", 30.211, 74.9455),
    ("HR-HIS", "Hisar", "Haryana", 29.1492, 75.7217),
    ("HR-KAR", "Karnal", "Haryana", 29.6857, 76.9905),
    ("HP-SML", "Shimla", "Himachal Pradesh", 31.1048, 77.1734),
    ("UK-DDN", "Dehradun", "Uttarakhand", 30.3165, 78.0322),
    ("AS-GUW", "Kamrup (Guwahati)", "Assam", 26.1445, 91.7362),
    ("AS-DIB", "Dibrugarh", "Assam", 27.4728, 94.912),
    ("AS-JOR", "Jorhat", "Assam", 26.7509, 94.2037),
]


def main():
    all_rows = []

    for year in range(START_YEAR, END_YEAR + 1):
        print(f"--- Year {year} ---")
        try:
            imdlib.get_data("rain", year, year, fn_format="yearwise", file_dir=CACHE_DIR)
            data = imdlib.open_data("rain", year, year, fn_format="yearwise", file_dir=CACHE_DIR)
            ds = data.get_xarray()  # xarray Dataset: dims (time, lat, lon)
        except Exception as e:
            print(f"  FAILED for {year}: {e}")
            continue

        for district_id, name, state, lat, lon in DISTRICTS:
            try:
                point = ds.sel(lat=lat, lon=lon, method="nearest")
                df = point.to_dataframe().reset_index()
                rain_col = "rain" if "rain" in df.columns else df.columns[-1]
                df = df[df[rain_col] > -100]  # IMD's missing-value sentinel is large negative
                for _, r in df.iterrows():
                    all_rows.append(
                        {
                            "district_id": district_id,
                            "date": pd.Timestamp(r["time"]).strftime("%Y-%m-%d"),
                            "rainfall_mm": float(r[rain_col]),
                        }
                    )
            except Exception as e:
                print(f"  point extract failed for {name} ({year}): {e}")

        print(f"  done, {len(all_rows)} rows so far")

    out = pd.DataFrame(all_rows)
    out.to_csv("imd_district_rainfall.csv", index=False)
    print(f"\nWrote imd_district_rainfall.csv: {len(out)} rows, {out.district_id.nunique()} districts")


if __name__ == "__main__":
    main()
