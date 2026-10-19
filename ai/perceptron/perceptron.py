#Perceptron Steps

training_data = [([0,0],-1), ([0,1],-1), ([1,0],-1), ([1,1],1)]


weights = [0,0]
bias = 0        
learning_rate = 0.1

def activate(value):
    return 1 if value > 0 else -1


for epoch in range(20):
    for inputs, target in training_data:
        weighted_sum = sum(x*w for x, w in zip(inputs, weights)) + bias

        prediction = activate(weighted_sum)

        if prediction !=target:
            print(f"Epoch: {epoch}, Input: {inputs}, Target: {target}, Prediction: {prediction}")
            for i in range(len(weights)):
                weights[i] += (learning_rate*target*inputs[i])

            bias += learning_rate * target  

    for inputs, target in training_data:
        weighted_sum = sum(x*w for x, w in zip(inputs, weights)) + bias
        prediction = activate(weighted_sum)
        print(f"Input: {inputs}, Target: {target}, Prediction: {prediction}")
        print(f"Weights: {weights}, Bias: {bias}")


print(f"Final Weights: {weights}, Final Bias: {bias}")
