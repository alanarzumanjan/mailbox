#include <iostream>
#include <iomanip>

using namespace std;

int main() {
    int number;
    int tempNumber;
    int lastDigit;
    int digitSum = 0;
    float average;

    cout << "Enter number: ";
    cin >> number;

    int nonZeroCount = 0; 
    tempNumber = number;  

    while (tempNumber != 0) {
        tempNumber = tempNumber / 10;
        nonZeroCount++;
    }
    cout << "Digit count: " << nonZeroCount << endl;

    while (number != 0) {
        lastDigit = number % 10;
        number = (number - lastDigit) / 10;
        digitSum += lastDigit;

        if (lastDigit == 0) {
            nonZeroCount--;
        }
    }

    cout << "Digit sum: " << digitSum << endl;

    if (nonZeroCount == 0) {
        average = 0;
    } 
    else {
        average = static_cast<float>(digitSum) / nonZeroCount; 
    }

    cout << fixed << setprecision(1);
    cout << "average: " << average << endl;

    return 0;
}
