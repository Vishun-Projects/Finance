import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.profiles.base import BaseStyle


def test_extract_entities():
    style = BaseStyle()
    cases = [
        (
            "YESB0MCHUPI/Vinod INR Singh Rajput /XXXXX /paytm.s1o0eec@pty Date Transaction Details /UPI/614392751560/UPI/BRANCH : ATM SERVICE BRANCH",
            None,
            "Vinod Singh Rajput",
        ),
        (
            "HDFC0MERUPI/VODAFON INR EIDEA LIMITED/XXXXX18185/vil.pay",
            "Vodafon Eidea Limited",
            None,
        ),
        (
            "YESB0YBLUPI/Sunrise Counter 03 QR / /q638827937@ybl /UPI/566608935252/gulab jamun chips",
            "Sunrise Counter 03 Qr",
            None,
        ),
        (
            "HDFC0002504/MAMTA MUNSHEELAL VISHWAKARMA //mamtavishw akarma0948@okhdfcbank /UPI/566651688219/Recharge",
            None,
            "Mamta Munsheelal Vishwakarma",
        ),
        (
            "YESB0PTMUPI/ANGAD INR CHAURASIYA /XXXXX /paytmqr6vazsa@ptys/UPI 609293737691/UPI/BRANC H : ATM SERVICE BRANCH",
            None,
            "Angad Chaurasiya",
        ),
        (
            "YESB0PTMUPI/MEWALAL INR KASHYAP /XXXXX /paytmqr5y5dei@ptys/UPI/6 09264370645/dahi Puri/BRANCH : ATM SERVICE BRANCH",
            None,
            "Mewalal Kashyap",
        ),
        (
            "YESB0PTMUPI/Baijnath INR Motilal Gupta /XXXXX /paytmqr5f5dq9@ptys/UPI/609255989873/milk and farsan/BRANCH : ATM SERVICE BRANCH",
            None,
            "Baijnath Motilal Gupta",
        ),
        (
            "YESB0PTMUPI/Baijnat INR h Motilal Gupta /XXXXX /paytmqr5f5dq9@ptys/U PI/512881361700/UPI/B RANCH : ATM SERVICE BRANCH",
            None,
            "Baijnath Motilal Gupta",
        ),
        (
            "KKBK0000651/8591418951 INR @ptyes /XXXXX18951/8591418951 @ptyes /UPI/645858210668/hrhe /BRANCH : ATM SERVICE BRANCH",
            None,
            "Hrhe",
        ),
        (
            "KKBK0000651/RIZA NOOR FATHMA SHAKIL A SIDD /XXXXX18951/rizasiddiqui7 @okhdfcbank /UPI/120983348342/UPI/BR ANCH : ATM SERVICE BRANCH",
            None,
            "Riza Noor Fathma Shakil A Sidd",
        ),
        (
            "YESB0YBLUPI/Mr RADHE INR SHYAM PANC/XXXXX /q184220370@ybl /UPI/645809611132/soap /BRANCH : ATM SERVICE BRANCH",
            None,
            "Mr Radhe Shyam Panc",
        ),
    ]

    for text, expected_store, expected_person in cases:
        store, person, _conf, _commodity, _upi = style.extract_entities(text)
        if expected_person:
            assert person == expected_person, f"person mismatch for {text[:40]}... got {person!r}"
            assert store is None, f"expected no store for {text[:40]}... got {store!r}"
        if expected_store:
            assert store == expected_store, f"store mismatch for {text[:40]}... got {store!r}"


if __name__ == "__main__":
    test_extract_entities()
    print("OK")
