# selects rows down to a certain time granularity; tosses out extraneous rows

granularity = 0.1

currentTime = 0
with open("./body-left-raw.csv", "r") as raw, open("./body-left.js", "w+") as output:
  lastValid = raw.readline()
  done = False
  output.write("const trackingDataBodyLeft = Float32Array.from([")
  while True:
    if done:
      break

    output.write(",".join([("-1" if n.strip() == "-1" else str(round(float(n.strip()), 3))) for n in lastValid.split(",")[1:] if len(n.strip()) > 0]) + ",\n")
    currentTime += granularity
  
    while True:
      lastValid = raw.readline()
      if len(lastValid.strip()) == 0:
        done = True
        break
      if float(lastValid[:lastValid.find(',')]) >= currentTime:
        break
  output.write("]);") 
  
    