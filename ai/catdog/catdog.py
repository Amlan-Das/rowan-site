import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder
from PIL import Image
import numpy as np
import matplotlib.pyplot as plt

epoch_accuracies = []

weights_zeros=np.zeros(1024)
bias = 0 
learning_rate = 0.01


transform = transforms.Compose([
    transforms.Resize((32, 32)),
    transforms.ToTensor() 
])





dataset = ImageFolder(root="data/train", transform=transform)

print(dataset.class_to_idx)

correct = 0 
for epoch in range(100):
    image_tensore = np.random.permutation(len(dataset))

    for i in image_tensore:
        image_tensor, label = dataset[i]
        


        grey_image_transform = transforms.Grayscale(num_output_channels=1)

        grey_image= grey_image_transform(image_tensor)

        grey_flatten = grey_image.flatten()

       


        weidghted_sum = np.dot(weights_zeros, grey_flatten) + bias

        activation = 1 if weidghted_sum > 0 else 0


        error = label - activation  

        if label == activation:
            correct += 1

        #gonna have to multiply the error by the input values to get weight updates 

        result = np.multiply(error, grey_flatten) 


        #wnew weights = old weights + (learning rate * input * error)

        final = np.add(weights_zeros, result * learning_rate)
        weights_zeros = final
        bias = bias + (learning_rate * error)
        accuracy = correct / len(dataset) * 1000
    epoch_accuracies.append(accuracy)


    #transforms.ToPILImage()(grey_image).show()


accuracy = correct / (len(dataset)*1000)
print("Image Shape:", image_tensor.shape)
print("Class Label:", label)
print ("correct:", accuracy)

plt.plot(epoch_accuracies)
plt.title("Training Accuracy over Epochs")
plt.xlabel("Epochs")
plt.ylabel("Accuracy (%)")  
plt.grid(True)
plt.show()
plt.imshow(weights_zeros.reshape(32, 32), cmap="coolwarm")

plt.colorbar(label="Weight Value")
plt.title("Learned Pixel Weights")

plt.show()
imagefolder = ImageFolder(root="data/test", transform=transform)

test_dataset = ImageFolder(root="data/test", transform=transform)

print("Number of test images:", len(test_dataset))

'''
for tensor , dog in imagefolder: 
    grey_image_transform = transforms.Grayscale(num_output_channels=1)

    grey_image= grey_image_transform(tensor)

    grey_flatten = grey_image.flatten()

    weidghted_sum = np.dot(weights_zeros, grey_flatten) + bias

    activation = 1 if weidghted_sum > 0 else 0

    print("Predicted:", activation, "Actual:", dog)

    '''
