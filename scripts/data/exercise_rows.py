# ตารางกิจกรรมออกกำลังกาย อ้างอิง 2024 Adult Compendium of Physical Activities
# แต่ละระดับ: (MET, "รหัส คำอธิบายใน Compendium")  — รายการที่ไม่มีรหัสคือบรรทัดที่ PDF ไม่แสดงรหัสคู่กัน
ROWS = [
 # id, ชื่อ, คำค้น, หมวด, ปุ่มลัด, นาทีเริ่มต้น, เบา, ปานกลาง, หนัก
 ("incline_walk","เดินชัน","เดินขึ้นเนิน, เดินลู่ชัน, incline","cardio",True,30,(5.3,"17034 Climbing hills, no load, 1 to 5% grade, moderate-to-brisk pace"),(7.0,"17035 Climbing hills, no load, 6 to 10% grade, moderate-to-brisk pace"),(8.8,"17036 Climbing hills, no load, 11 to 20% grade, slow-to-moderate pace")),
 ("walking","เดินเร็ว / เดินทั่วไป","เดิน, เดินเร็ว, walk","cardio",True,35,(3.0,"17170 Walking, 2.5 mph, firm, level surface"),(3.8,"17190 Walking, 2.8 to 3.4 mph, level, moderate pace"),(4.8,"17200 Walking, 3.5 to 3.9 mph, level, brisk, walking for exercise")),
 ("running","วิ่ง","วิ่ง, จ๊อกกิ้ง, run, jogging","cardio",True,30,(6.5,"12028 Running, 4 to 4.2 mph (13 min/mile)"),(9.3,"12050 Running, 6-6.3 mph (10 min/mile)"),(11.0,"12070 Running, 7 mph (8.5 min/mile)")),
 ("cycling","ปั่นจักรยาน","จักรยาน, ปั่น, bike, cycling","cardio",True,40,(4.3,"01015 Bicycling, self-selected easy pace"),(7.0,"01016 Bicycling, self-selected moderate pace"),(9.0,"01017 Bicycling, self-selected vigorous pace")),
 ("swimming","ว่ายน้ำ","ว่ายน้ำ, swim","cardio",True,40,(5.8,"18240 Swimming laps, freestyle, slow, recreational"),(8.0,"18290 Swimming, crawl, medium speed, ~50 yards/minute"),(9.8,"18230 Swimming laps, freestyle, fast, vigorous effort")),
 ("weight_training","เวตเทรนนิ่ง","เวต, ยกน้ำหนัก, weight","strength",True,45,(3.5,"02064 Resistance training, multiple exercises, 8-15 reps"),(5.0,"02061 Resistance training, squats, deadlift"),(6.0,"02057 Resistance, power lifting or body building, vigorous effort")),
 ("dumbbell","ดัมเบล / บอดี้เวต","ดัมเบล, บอดี้เวต, bodyweight","strength",True,40,(3.0,"02070 Body weight resistance exercises, general"),(3.8,"02022 Calisthenics, moderate effort"),(7.5,"02020 Calisthenics, vigorous effort")),
 ("yoga","โยคะ / พิลาทิส","โยคะ, พิลาทิส, yoga, pilates","strength",True,45,(2.3,"Yoga, Hatha"),(2.8,"02120 Pilates, general"),(4.0,"Yoga, Power")),
 ("aerobics","เต้นแอโรบิก / ซุมบ้า","แอโรบิก, ซุมบ้า, aerobic, zumba","cardio",True,40,(4.8,"02005 Aerobic dance, low impact, moderate effort"),(7.3,"02000 Aerobic, general"),(8.0,"02006 Aerobic dance, high impact, vigorous effort")),
 ("badminton","แบดมินตัน","แบด, badminton","cardio",True,45,(5.5,"Badminton, social singles and doubles, general"),(7.0,"15118 Badminton, competitive"),(9.0,"15125 Badminton, competitive, match play")),
 ("basketball","บาสเกตบอล","บาส, basketball","cardio",True,45,(6.0,"15140 Basketball, non-game, general"),(7.5,"Basketball, general"),(8.0,"Basketball, game")),
 ("football","ฟุตบอล","บอล, ฟุตบอล, soccer, football","cardio",True,45,(3.5,"15615 Walking football/soccer"),(7.0,"15610 Soccer, casual, general"),(9.5,"15605 Soccer, competitive")),
 ("muay_thai","มวยไทย / คาร์ดิโอบ็อกซิ่ง","มวย, ชกมวย, muay thai, boxing","hybrid",True,40,(5.8,"Boxing, punching bag"),(7.3,"15457 Kickboxing"),(10.3,"15430 Martial Arts, moderate pace (kick boxing)")),
 ("hiit","HIIT","hiit, tabata, เบิร์นพี","hybrid",True,25,(5.0,"02045 Circuit training, moderate effort"),(7.0,"High intensity interval exercise, moderate effort"),(11.0,"High intensity interval exercise, burpees, mountain climbers, Tabata")),
 ("tennis","เทนนิส","tennis, เทนนิส","cardio",False,60,(5.0,"15695 Tennis, hitting balls, non-game play"),(6.8,"15675 Tennis, general, moderate effort"),(8.0,"15690 Tennis, singles")),
 ("table_tennis","ปิงปอง","ปิงปอง, เทเบิลเทนนิส, table tennis, ping pong","cardio",False,45,(4.0,"15660 Table tennis, ping pong"),(4.0,"15660 Table tennis, ping pong"),(4.0,"15660 Table tennis, ping pong")),
 ("jump_rope","กระโดดเชือก","กระโดดเชือก, jump rope, skipping","cardio",False,15,(8.3,"15552 Rope jumping, slow pace, < 100 skips/min"),(11.8,"15551 Rope jumping, moderate pace, 100 to 120 skips/min"),(12.3,"15550 Rope jumping, fast pace, 120-160 skips/min")),
 ("volleyball","วอลเลย์บอล","วอลเลย์, volleyball","cardio",False,45,(3.0,"15720 Volleyball, non-competitive, general"),(4.0,"15710 Volleyball"),(6.0,"15711 Volleyball, competitive, in gymnasium")),
 ("beach_volleyball","วอลเลย์บอลชายหาด","วอลเลย์ชายหาด, beach volleyball","cardio",False,45,(8.0,"15725 Volleyball, beach, in sand"),(8.0,"15725 Volleyball, beach, in sand"),(8.0,"15725 Volleyball, beach, in sand")),
 ("sepak_takraw","ตะกร้อ","ตะกร้อ, takraw","cardio",False,45,(3.0,"15720 Volleyball, non-competitive (Compendium ไม่มีตะกร้อ ใช้กีฬาข้ามตาข่ายที่ใกล้เคียง)"),(4.0,"15710 Volleyball (ใกล้เคียง)"),(6.0,"15711 Volleyball, competitive (ใกล้เคียง)")),
 ("futsal","ฟุตซอล","ฟุตซอล, futsal","cardio",False,40,(7.0,"15610 Soccer, casual, general"),(7.8,"15195 Futsal"),(9.5,"15605 Soccer, competitive")),
 ("golf","กอล์ฟ (เดิน)","กอล์ฟ, golf","other",False,90,(3.5,"15270 Golf, miniature, driving range"),(4.3,"15265 Golf, walking, carrying clubs"),(4.5,"15255 Golf, general")),
 ("hiking","เดินป่า / เดินขึ้นเขา","เดินป่า, เดินขึ้นเขา, hiking, trekking","cardio",False,90,(3.8,"17081 Hiking slowly through fields and hillsides, no load"),(5.3,"17082 Hiking at a normal pace through fields and hillsides"),(7.8,"17012 Backpacking, hiking with a daypack")),
 ("stairs","เดินขึ้นบันได","บันได, stairs","cardio",False,15,(4.5,"17133 Stair climbing, slow pace"),(6.8,"17131 Stair climbing, general"),(9.3,"17134 Stair climbing, fast pace")),
 ("rowing_machine","เครื่องกรรเชียงบก","กรรเชียง, rowing, โรวิ่ง","cardio",False,20,(7.5,"02072 Rowing, stationary, 100 to 149 watts"),(11.0,"02074 Rowing, stationary, 150 to 199 watts"),(14.0,"02080 Rowing, stationary, 200 watts")),
 ("elliptical","เครื่องเดินวงรี (Elliptical)","elliptical, อีลิปติคอล, วงรี","cardio",False,30,(5.0,"02052 Elliptical trainer, moderate effort"),(5.0,"02052 Elliptical trainer, moderate effort"),(9.0,"02055 Elliptical trainer, vigorous effort")),
 ("stationary_bike","จักรยานอยู่กับที่ / Spinning","spinning, สปินนิ่ง, จักรยานอยู่กับที่","cardio",False,30,(4.0,"01214 Bicycling, stationary, 50 watts, light effort"),(6.8,"01200 Bicycling, stationary, general"),(9.0,"01270 Bicycling, stationary, RPM/Spin bike class")),
 ("dance","เต้น (ทั่วไป)","เต้น, dance, แดนซ์, cover","cardio",False,40,(3.8,"03078 Contemporary dancing, general"),(5.0,"03010 Ballet, modern, or jazz general"),(9.8,"03031 Nightclub or folk dancing, vigorous effort")),
 ("boxing_bag","ชกกระสอบทราย","กระสอบ, boxing bag","hybrid",False,30,(5.8,"Boxing, punching bag"),(7.0,"Boxing, punching bag, 60 b/min"),(8.5,"Boxing, punching bag, 120 b/min")),
 ("martial_arts","ศิลปะป้องกันตัว (เทควันโด / คาราเต้ / ยูโด)","เทควันโด, คาราเต้, ยูโด, จูจิตสู, taekwondo, karate, judo","hybrid",False,60,(5.3,"15425 Martial Arts, slower pace, novice, practice"),(10.3,"15430 Martial Arts, moderate pace"),(10.3,"15430 Martial Arts, moderate pace")),
 ("rock_climbing","ปีนผา / บอลเดอริ่ง","ปีนผา, บอลเดอ, climbing, bouldering","hybrid",False,60,(5.8,"15537 Rock climbing, low-to-moderate difficulty"),(8.0,"15533 Rock or mountain climbing"),(8.8,"15534 Rock climbing, free boulder")),
 ("skateboard","สเก็ตบอร์ด / เซิร์ฟสเก็ต","สเก็ต, skate","cardio",False,40,(5.0,"15580 Skateboarding, general, moderate effort"),(6.0,"15582 Skateboarding, competitive, vigorous effort"),(8.3,"15596 Skateboard, longboard, typical speed")),
 ("inline_skate","โรลเลอร์เบลด","โรลเลอร์, rollerblade, inline","cardio",False,40,(7.5,"15591 Roller blading, recreational pace"),(9.8,"15592 Roller blading, moderate pace"),(12.3,"15593 Roller blading, fast pace")),
 ("kayak","พายเรือคายัค / SUP","คายัค, พายเรือ, kayak, sup, paddle","cardio",False,60,(3.8,"18226 Stand up Paddleboard, 20-29 strokes/min"),(5.0,"18100 Kayaking, moderate effort"),(6.5,"18224 Stand up paddle boarding, general")),
 ("surfing","เซิร์ฟ","เซิร์ฟ, surf","cardio",False,60,(3.0,"18220 Surfing, body or board, general"),(5.0,"18222 Surfing, competitive"),(6.8,"18221 Surfboard, paddling")),
 ("tai_chi","ไทเก๊ก / ชี่กง","ไทเก๊ก, ชี่กง, tai chi, qigong","other",False,30,(3.3,"15670 Tai chi, qi gong, general"),(3.3,"15670 Tai chi, qi gong, general"),(6.0,"15674 Tai chi chuan, Yang style")),
 ("stretching","ยืดเหยียด","ยืด, stretch","other",False,15,(2.3,"02116 Stretching, mild"),(2.3,"02116 Stretching, mild"),(2.3,"02116 Stretching, mild")),
 ("circuit","เซอร์กิตเทรนนิ่ง","เซอร์กิต, circuit, crossfit, ครอสฟิต","hybrid",False,30,(3.5,"02035 Circuit training, light effort"),(5.0,"02045 Circuit training, moderate effort"),(7.5,"02049 Circuit training, kettlebells, minimal rest, vigorous")),
 ("calisthenics","คาลิสเธนิกส์ (วิดพื้น / ซิทอัพ)","วิดพื้น, ซิทอัพ, คาลิส, push up, sit up, plank","strength",False,20,(2.8,"02024 Calisthenics, light effort"),(3.8,"02022 Calisthenics, moderate effort"),(7.5,"02020 Calisthenics, vigorous effort")),
 ("trampoline","แทรมโพลีน","แทรมโพลีน, trampoline","cardio",False,30,(6.3,"15700 Trampoline, recreational"),(6.3,"15700 Trampoline, recreational"),(10.3,"15702 Trampoline, competitive")),
 ("gardening","ทำสวน / ขุดดิน","ทำสวน, ขุดดิน, gardening","other",False,45,(2.0,"08066 Gardening, general"),(3.8,"08245 Gardening, general, moderate effort"),(5.0,"08050 Digging, spading, filling garden")),
 ("housework","ทำความสะอาดบ้าน / ถูพื้น","ทำความสะอาด, ถูพื้น, กวาดบ้าน, งานบ้าน, cleaning","other",False,30,(2.5,"05050 Cleaning, general, light effort"),(3.3,"05044 Cleaning, house, general, moderate effort"),(3.5,"05021 Cleaning, mopping, standing, moderate effort")),
 ("walk_dog","พาสุนัขเดินเล่น","หมา, สุนัข, dog","other",False,30,(3.0,"17165 Walking the dog"),(3.0,"17165 Walking the dog"),(3.8,"17190 Walking, moderate pace")),
 ("frisbee","อัลติเมทฟริสบี้","ฟริสบี้, frisbee","cardio",False,45,(3.0,"15240 Frisbee playing, general"),(8.0,"15250 Frisbee, ultimate"),(8.0,"15250 Frisbee, ultimate")),
 ("squash","สควอช","สควอช, squash","cardio",False,45,(7.3,"15652 Squash, general"),(7.3,"15652 Squash, general"),(12.0,"15650 Squash")),
 ("pickleball","พิกเคิลบอล","พิกเคิล, pickleball","cardio",False,45,(6.0,"15500 Paddleball, casual (ใกล้เคียง)"),(6.0,"15500 Paddleball, casual (ใกล้เคียง)"),(10.0,"15490 Paddleball, competitive (ใกล้เคียง)")),
]

HEADER = ["รหัส", "ชื่อกิจกรรม", "คำค้น", "หมวด", "ปุ่มลัดในแอป", "นาทีเริ่มต้น",
          "MET เบา", "อ้างอิง (เบา)", "MET ปานกลาง", "อ้างอิง (ปานกลาง)", "MET หนัก", "อ้างอิง (หนัก)"]


def table():
    out = [HEADER]
    for r in ROWS:
        id_, name, kw, cat, shortcut, mins, lo, mid, hi = r
        out.append([id_, name, kw, cat, shortcut, mins, lo[0], lo[1], mid[0], mid[1], hi[0], hi[1]])
    return out


if __name__ == "__main__":
    import json, sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(table(), ensure_ascii=False))
